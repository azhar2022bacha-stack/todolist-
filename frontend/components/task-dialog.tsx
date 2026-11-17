'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import type { Task, TaskInput, TaskPriority, TaskStatus } from '@/types/task';

interface TaskDialogProps {
  task?: Task | null;
  onClose: () => void;
  onSave: (input: TaskInput) => Promise<void>;
}

function toLocalInput(date: string | null | undefined) {
  if (!date) return '';
  const value = new Date(date);
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function TaskDialog({ task, onClose, onSave }: TaskDialogProps) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'PENDING');
  const [dueDate, setDueDate] = useState(toLocalInput(task?.dueDate));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, saving]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-scrim" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">{task ? 'TASK DETAILS' : 'NEW TASK'}</p>
            <h2 id="dialog-title">{task ? 'Edit task' : 'Create a task'}</h2>
          </div>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose} disabled={saving}>
            <X size={19} />
          </button>
        </div>

        <form className="task-form" onSubmit={submit}>
          <label className="field">
            <span>Task title <b>*</b></span>
            <input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to get done?" />
          </label>
          <label className="field">
            <span>Description <small>OPTIONAL</small></span>
            <textarea rows={4} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a few details to help you get started…" />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Priority</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
                <option value="PENDING">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Due date <small>OPTIONAL</small></span>
            <div className="date-input-wrap">
              <CalendarDays size={17} />
              <input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
          </label>
          <div className="dialog-actions">
            <button type="button" className="button button-quiet" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
