'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  Circle,
  CircleAlert,
  Clock3,
  Command,
  Flag,
  LayoutDashboard,
  ListFilter,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { TaskDialog } from '@/components/task-dialog';
import { createTask, deleteTask, getStats, getTasks, updateTask } from '@/services/tasks';
import type { DueFilter, Task, TaskInput, TaskPriority, TaskSort, TaskStats, TaskStatus } from '@/types/task';

const EMPTY_STATS: TaskStats = { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 };
const PRIORITY_WEIGHT: Record<TaskPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function taskDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function isOverdue(task: Task) {
  return task.status !== 'COMPLETED' && task.dueDate !== null && new Date(task.dueDate) < new Date();
}

function labelStatus(status: TaskStatus) {
  return status === 'IN_PROGRESS' ? 'In progress' : status === 'COMPLETED' ? 'Completed' : 'To do';
}

function labelPriority(priority: TaskPriority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>(EMPTY_STATS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | 'ALL'>('ALL');
  const [priority, setPriority] = useState<TaskPriority | 'ALL'>('ALL');
  const [due, setDue] = useState<DueFilter>('ALL');
  const [sort, setSort] = useState<TaskSort>('NEWEST');
  const [activeView, setActiveView] = useState<'all' | 'today' | 'completed'>('all');
  const [dialogTask, setDialogTask] = useState<Task | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);

  const announce = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  }, []);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '8', sort });
    if (search.trim()) params.set('search', search.trim());
    if (status !== 'ALL') params.set('status', status);
    if (priority !== 'ALL') params.set('priority', priority);
    if (due !== 'ALL') params.set('due', due);
    if (activeView === 'today') params.set('due', 'TODAY');
    if (activeView === 'completed') params.set('status', 'COMPLETED');
    return params;
  }, [activeView, due, page, priority, search, sort, status]);

  const refresh = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const [result, summary] = await Promise.all([getTasks(query), getStats()]);
      setTasks(result.items);
      setTotalPages(Math.max(result.pagination.totalPages, 1));
      setStats(summary);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong while loading tasks.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), search ? 280 : 0);
    return () => window.clearTimeout(timer);
  }, [refresh, search]);

  useEffect(() => {
    setPage(1);
  }, [search, status, priority, due, sort, activeView]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.current?.focus();
      }
    }
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  async function saveTask(input: TaskInput) {
    setBusy(true);
    try {
      if (dialogTask) {
        await updateTask(dialogTask.id, input);
        announce('Your changes have been saved.');
      } else {
        await createTask(input);
        setActiveView('all');
        setStatus('ALL');
        setPriority('ALL');
        setDue('ALL');
        setSort('NEWEST');
        setPage(1);
        announce('Task created and saved.');
      }
      setDialogTask(undefined);
      await refresh(false);
    } catch (reason) {
      announce(reason instanceof Error ? reason.message : 'Could not save your task.');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(task: Task) {
    const next = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await updateTask(task.id, {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: next,
        dueDate: task.dueDate,
      });
      announce(next === 'COMPLETED' ? 'Task completed. Nice work!' : 'Task moved back to to do.');
      await refresh(false);
    } catch (reason) {
      announce(reason instanceof Error ? reason.message : 'Could not update task status.');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteTask(deleteTarget.id);
      setDeleteTarget(null);
      announce('Task deleted.');
      await refresh(false);
    } catch (reason) {
      announce(reason instanceof Error ? reason.message : 'Could not delete task.');
    }
  }

  const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const completionRate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const activeFilters = status !== 'ALL' || priority !== 'ALL' || due !== 'ALL' || search.length > 0;

  const visibleTasks = sort === 'PRIORITY'
    ? [...tasks].sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority])
    : tasks;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Daymark home">
          <span className="brand-mark"><CheckCheck size={19} strokeWidth={2.5} /></span>
          <span>daymark<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-switcher">
          <div className="workspace-avatar">A</div>
          <div className="workspace-copy"><strong>My workspace</strong><span>Personal plan</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <p className="nav-caption">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          <button className="nav-item active" onClick={() => setActiveView('all')}><LayoutDashboard size={17} /><span>Overview</span></button>
          <button className={`nav-item ${activeView === 'today' ? 'active' : ''}`} onClick={() => setActiveView('today')}><CalendarDays size={17} /><span>Today</span><span className="nav-count">{stats.pending + stats.inProgress}</span></button>
          <button className={`nav-item ${activeView === 'completed' ? 'active' : ''}`} onClick={() => setActiveView('completed')}><Check size={17} /><span>Completed</span></button>
        </nav>

        <p className="nav-caption list-caption">YOUR FOCUS</p>
        <div className="focus-card">
          <div className="focus-icon"><Target size={17} /></div>
          <div className="focus-label"><strong>Daily progress</strong><span>{stats.completed} of {stats.total} tasks done</span></div>
          <span className="focus-percent">{completionRate}%</span>
          <div className="progress-track"><span style={{ width: `${completionRate}%` }} /></div>
        </div>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-sparkle"><Sparkles size={16} /></div>
            <strong>Make room for more</strong>
            <p>Your best work starts with a clear mind.</p>
            <button onClick={() => setDialogTask(null)}>Add a task <ArrowUpRight size={14} /></button>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">A</div>
            <div className="profile-copy"><strong>Alex Morgan</strong><span>Personal workspace</span></div>
            <MoreHorizontal size={19} className="muted-icon" />
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{activeView === 'today' ? 'Today' : activeView === 'completed' ? 'Completed' : 'Overview'}</strong></div>
          <div className="topbar-right">
            <span className="date-chip"><CalendarDays size={15} />{todayLabel}</span>
            <span className="avatar-small">A</span>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow welcome-eyebrow"><span className="live-dot" /> YOUR PERSONAL WORKSPACE</p>
              <h1>{activeView === 'today' ? 'Today, in focus.' : activeView === 'completed' ? 'Look what you’ve done.' : 'Make today count.'}</h1>
              <p className="welcome-subtitle">A little progress each day adds up to big results.</p>
            </div>
            <button className="button button-primary create-button" onClick={() => setDialogTask(null)}><Plus size={18} /> New task</button>
          </section>

          <section className="stats-grid" aria-label="Task statistics">
            <article className="stat-card stat-total">
              <div className="stat-top"><span className="stat-icon total-icon"><ListFilter size={17} /></span><span className="stat-label">Total tasks</span><MoreHorizontal size={17} className="stat-more" /></div>
              <div className="stat-number">{stats.total}<span className="stat-unit"> tasks</span></div>
              <div className="stat-foot"><span className="stat-foot-dot total-dot" />Across your workspace</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-icon pending-icon"><Circle size={16} /></span><span className="stat-label">To do</span><MoreHorizontal size={17} className="stat-more" /></div>
              <div className="stat-number">{stats.pending}</div>
              <div className="stat-foot"><span className="stat-foot-dot pending-dot" />Ready when you are</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-icon progress-icon"><Clock3 size={17} /></span><span className="stat-label">In progress</span><MoreHorizontal size={17} className="stat-more" /></div>
              <div className="stat-number">{stats.inProgress}</div>
              <div className="stat-foot"><span className="stat-foot-dot progress-dot" />Work in motion</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-icon done-icon"><Check size={17} /></span><span className="stat-label">Completed</span><MoreHorizontal size={17} className="stat-more" /></div>
              <div className="stat-number">{stats.completed}</div>
              <div className="stat-foot"><span className="stat-foot-dot done-dot" />{completionRate}% of all tasks</div>
            </article>
            <article className="stat-card overdue-card">
              <div className="stat-top"><span className="stat-icon overdue-icon"><CircleAlert size={17} /></span><span className="stat-label">Overdue</span><MoreHorizontal size={17} className="stat-more" /></div>
              <div className="stat-number">{stats.overdue}</div>
              <div className="stat-foot"><span className="stat-foot-dot overdue-dot" />Needs your attention</div>
            </article>
          </section>

          <section className="task-section">
            <div className="section-heading">
              <div>
                <div className="section-title-row"><h2>{activeView === 'today' ? 'Due today' : activeView === 'completed' ? 'Completed tasks' : 'Your tasks'}</h2><span className="task-count">{tasks.length}</span></div>
                <p className="section-subtitle">{activeView === 'today' ? 'Everything on your plate today.' : activeView === 'completed' ? 'A record of all the progress you’ve made.' : 'The small steps that move you forward.'}</p>
              </div>
              <button className="button button-outline" onClick={() => setDialogTask(null)}><Plus size={16} /> Add task</button>
            </div>

            <div className="toolbar">
              <label className="search-box">
                <Search size={17} />
                <input ref={searchInput} aria-label="Search tasks" placeholder="Search tasks…" value={search} onChange={(event) => setSearch(event.target.value)} />
                {search ? <button className="search-clear" aria-label="Clear search" onClick={() => setSearch('')}><X size={14} /></button> : <kbd><Command size={11} /> K</kbd>}
              </label>
              <div className="filter-controls">
                <label className="filter-select"><Flag size={14} /><select aria-label="Filter by priority" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | 'ALL')}><option value="ALL">Priority</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select><ChevronDown size={13} /></label>
                <label className="filter-select"><ListFilter size={14} /><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus | 'ALL')}><option value="ALL">Status</option><option value="PENDING">To do</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select><ChevronDown size={13} /></label>
                <label className="filter-select due-filter"><CalendarDays size={14} /><select aria-label="Filter by due date" value={due} onChange={(event) => setDue(event.target.value as DueFilter)}><option value="ALL">Due date</option><option value="TODAY">Today</option><option value="UPCOMING">Upcoming</option><option value="OVERDUE">Overdue</option></select><ChevronDown size={13} /></label>
                <label className="filter-select sort-select"><ArrowDownWideNarrow size={14} /><select aria-label="Sort tasks" value={sort} onChange={(event) => setSort(event.target.value as TaskSort)}><option value="NEWEST">Newest</option><option value="OLDEST">Oldest</option><option value="PRIORITY">Priority</option></select><ChevronDown size={13} /></label>
              </div>
              {activeFilters && <button className="clear-filters" onClick={() => { setSearch(''); setStatus('ALL'); setPriority('ALL'); setDue('ALL'); }}>Clear filters <X size={13} /></button>}
            </div>

            {error && (
              <div className="error-banner" role="alert">
                <CircleAlert size={18} /><div><strong>Unable to load your tasks</strong><span>{error}</span></div>
                <button className="button button-outline" onClick={() => void refresh()}>Try again</button>
              </div>
            )}

            <div className="task-list" aria-live="polite">
              {loading ? (
                <div className="loading-state"><LoaderCircle size={22} className="spin" /><span>Loading your workspace…</span></div>
              ) : visibleTasks.length ? (
                visibleTasks.map((task) => (
                  <article className={`task-row ${task.status === 'COMPLETED' ? 'task-is-done' : ''}`} key={task.id}>
                    <button className={`task-check ${task.status === 'COMPLETED' ? 'checked' : ''}`} aria-label={task.status === 'COMPLETED' ? `Mark ${task.title} as to do` : `Mark ${task.title} complete`} onClick={() => void changeStatus(task)}>
                      {task.status === 'COMPLETED' && <Check size={13} strokeWidth={2.5} />}
                    </button>
                    <button className="task-main" onClick={() => setDialogTask(task)}>
                      <span className="task-title">{task.title}</span>
                      {task.description && <span className="task-description">{task.description}</span>}
                    </button>
                    <span className={`status-pill status-${task.status.toLowerCase()}`}><span />{labelStatus(task.status)}</span>
                    <span className={`priority-label priority-${task.priority.toLowerCase()}`}><i />{labelPriority(task.priority)}</span>
                    <span className={`task-due ${isOverdue(task) ? 'is-overdue' : ''}`}>{task.dueDate ? <><CalendarDays size={14} />{taskDate(task.dueDate)}</> : <span className="no-date">No due date</span>}</span>
                    <button className="row-menu" aria-label={`Delete ${task.title}`} onClick={() => setDeleteTarget(task)}><Trash2 size={15} /></button>
                  </article>
                ))
              ) : !error ? (
                <div className="empty-state">
                  <div className="empty-illustration"><div className="empty-sheet"><CheckCheck size={27} /></div><span className="empty-spark spark-one">✳</span><span className="empty-spark spark-two">✦</span></div>
                  <h3>{activeFilters ? 'No tasks match those filters' : activeView === 'today' ? 'Nothing due today' : activeView === 'completed' ? 'Your next win is waiting' : 'A clear canvas'}</h3>
                  <p>{activeFilters ? 'Try adjusting your search or clearing a filter.' : activeView === 'today' ? 'You’re all caught up for today. Enjoy the breathing room.' : activeView === 'completed' ? 'Complete a task and you’ll find it here.' : 'Every great day starts with one small step. Add your first task.'}</p>
                  {activeFilters ? <button className="button button-outline" onClick={() => { setSearch(''); setStatus('ALL'); setPriority('ALL'); setDue('ALL'); }}>Clear filters</button> : activeView !== 'completed' && <button className="button button-primary" onClick={() => setDialogTask(null)}><Plus size={16} /> Create a task</button>}
                </div>
              ) : null}
            </div>

            {!loading && totalPages > 1 && <div className="pagination"><span>Page {page} of {totalPages}</span><div><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ArrowLeft size={15} /></button><button aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ArrowRight size={15} /></button></div></div>}
          </section>

          <footer className="footer-note"><span>Made for a little more focus.</span><span><span className="footer-live" /> All changes saved</span></footer>
        </div>
      </section>

      {dialogTask !== undefined && <TaskDialog task={dialogTask} onClose={() => setDialogTask(undefined)} onSave={saveTask} />}
      {deleteTarget && <div className="dialog-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><div className="confirm-icon"><Trash2 size={19} /></div><h2 id="delete-title">Delete this task?</h2><p><strong>{deleteTarget.title}</strong> will be permanently removed from your workspace.</p><div className="dialog-actions"><button className="button button-quiet" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="button button-danger" onClick={() => void confirmDelete()}>Delete task</button></div></section></div>}
      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
      {busy && <div className="saving-indicator"><LoaderCircle size={14} className="spin" /> Saving changes</div>}
    </main>
  );
}
