/**
 * What a teammate means to do, how far it has got, and what it read.
 *
 * The plan is seeded before the model runs, so this is readable the moment work
 * is queued rather than after the first turn has already spent a few minutes.
 * That ordering is the whole value: an operator who can see the intended shape
 * of the work can stop it early when it is the wrong shape.
 *
 * `waiting` gets its own treatment rather than reading as a paler `pending`.
 * "Not started" and "blocked on somebody" are different facts, and only one of
 * them is something the operator can do anything about.
 *
 * Evidence sits underneath because it answers a different question from the
 * activity strip. The strip says what the teammate did; this says what it was
 * looking at when it decided to — which is what people actually ask when a
 * conclusion surprises them. Excerpts are the head of what came back, never a
 * summary: a summary would put the model in charge of deciding what mattered
 * about its own sources, which is precisely what somebody opens this to check.
 */

import {
  Check, CircleDashed, FileText, Globe, Hourglass, Loader2, Mail, User, X,
} from "lucide-react";
import type { Evidence, Task, TaskStep } from "../domain/types";

const STEP_ICONS = {
  pending: CircleDashed,
  running: Loader2,
  succeeded: Check,
  failed: X,
  waiting: Hourglass,
} as const;

const EVIDENCE_ICONS = {
  web: Globe,
  file: FileText,
  mail: Mail,
  user: User,
} as const;

function StepRow({ step }: { step: TaskStep }) {
  const Icon = STEP_ICONS[step.status] ?? CircleDashed;
  return <li className={`plan-step is-${step.status}`}>
    <Icon size={13} className={step.status === "running" ? "spin" : undefined} />
    <span className="plan-step-title">{step.title}</span>
    {step.detail && <span className="plan-step-detail">{step.detail}</span>}
  </li>;
}

function EvidenceRow({ item }: { item: Evidence }) {
  const Icon = EVIDENCE_ICONS[item.kind] ?? FileText;
  // Linked only when there is somewhere to go. A dead link that looks live is
  // worse than plain text.
  const heading = item.url
    ? <a href={item.url} target="_blank" rel="noreferrer noopener">{item.title}</a>
    : <span>{item.title}</span>;
  return <li className="evidence-row">
    <div className="evidence-head"><Icon size={12} />{heading}</div>
    <p className="evidence-excerpt">{item.excerpt}</p>
  </li>;
}

export function PlanPanel({ agentName, tasks }: { agentName: string; tasks: Task[] }) {
  if (tasks.length === 0) {
    return <p className="plan-empty">{agentName} has no scheduled or long-running work.</p>;
  }

  return <div className="plan-list">
    {tasks.map((task) => <section className="plan-task" key={task.id}>
      <div className="plan-task-head">
        <span className="plan-task-title">{task.title || task.kind}</span>
        <span className={`plan-task-status is-${task.status}`}>{task.status.replace("_", " ")}</span>
      </div>

      {/* Shown for what it is. A task retried twice is a fact about the work, and
          burying it would hide the thing worth asking about. */}
      {task.attempts > 1 && <p className="plan-task-attempts">
        picked up {task.attempts} times
      </p>}
      {task.error && <p className="plan-task-error">{task.error}</p>}

      {task.plan.length > 0 && <ol className="plan-steps">
        {task.plan.map((step) => <StepRow step={step} key={step.id} />)}
      </ol>}

      {task.evidence.length > 0 && <details className="evidence">
        <summary>What it read ({task.evidence.length})</summary>
        <ul className="evidence-list">
          {task.evidence.map((item, index) =>
            <EvidenceRow item={item} key={`${item.title}-${index}`} />)}
        </ul>
      </details>}
    </section>)}
  </div>;
}
