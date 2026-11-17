import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { DueDateFilter, ListTasksDto, TaskSort } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() ?? '',
        priority: dto.priority ?? TaskPriority.MEDIUM,
        status: dto.status ?? TaskStatus.PENDING,
        dueDate: dto.dueDate,
      },
    });
  }

  async findAll(query: ListTasksDto) {
    const now = new Date();
    const filters: Prisma.TaskWhereInput[] = [];

    if (query.search?.trim()) {
      filters.push({ title: { contains: query.search.trim(), mode: 'insensitive' } });
    }
    if (query.status) filters.push({ status: query.status });
    if (query.priority) filters.push({ priority: query.priority });

    if (query.due === DueDateFilter.OVERDUE) {
      filters.push({
        dueDate: { lt: now },
        status: { not: TaskStatus.COMPLETED },
      });
    } else if (query.due === DueDateFilter.TODAY) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filters.push({ dueDate: { gte: start, lt: end } });
    } else if (query.due === DueDateFilter.UPCOMING) {
      filters.push({ dueDate: { gte: now } });
    }

    const where: Prisma.TaskWhereInput = filters.length ? { AND: filters } : {};
    const orderBy: Prisma.TaskOrderByWithRelationInput[] =
      query.sort === TaskSort.PRIORITY
        ? [{ priority: 'desc' }, { createdAt: 'desc' }]
        : [{ createdAt: query.sort === TaskSort.OLDEST ? 'asc' : 'desc' }];
    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`Task "${id}" was not found`);
    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.findOne(id);
    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.task.delete({ where: { id } });
  }

  async stats() {
    const now = new Date();
    const [total, pending, inProgress, completed, overdue] = await Promise.all([
      this.prisma.task.count(),
      this.prisma.task.count({ where: { status: TaskStatus.PENDING } }),
      this.prisma.task.count({ where: { status: TaskStatus.IN_PROGRESS } }),
      this.prisma.task.count({ where: { status: TaskStatus.COMPLETED } }),
      this.prisma.task.count({
        where: {
          dueDate: { lt: now },
          status: { not: TaskStatus.COMPLETED },
        },
      }),
    ]);

    return { total, pending, inProgress, completed, overdue };
  }
}
