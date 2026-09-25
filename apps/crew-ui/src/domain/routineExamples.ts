/**
 * Something to ask for, when a teammate has no routines yet.
 *
 * A routine is the feature that makes a teammate an always-on one rather than
 * a chat window, and until now there was nowhere to find out it existed: the
 * panel's routines section renders only when `routines.length > 0`, so the
 * people who most needed to know — everybody who had never asked for one —
 * were the only people it was hidden from.
 *
 * The shape is octop's `task_examples`: pre-written natural-language prompts
 * shown as empty-state cards, chosen by what the expert is for. The strings
 * are ours — octop's are written for its own expert library, and a suggestion
 * that does not match the teammate in front of you is worse than none, because
 * the first thing it teaches is that these cards are decoration.
 *
 * They fill the composer rather than sending. The schedule in a suggestion is
 * a guess about somebody's morning, and the edit they want to make is almost
 * always to that guess.
 */

/** Matched against the teammate's role, lowercased. First hit wins. */
const BY_ROLE: ReadonlyArray<readonly [RegExp, readonly string[]]> = [
  [/support|ticket|helpdesk|customer/, [
    "Every weekday at 9am, go through the ticket queue and tell me which ones have been waiting longest.",
    "Each Friday afternoon, summarise what people asked about this week and what kept coming up.",
  ]],
  [/sales|crm|lead|account/, [
    "Every Monday at 8:30, list the deals that have had no contact in two weeks.",
    "On the first of each month, put together a one-page summary of how last month closed.",
  ]],
  [/research|analy|market|competit/, [
    "Every weekday morning, check what our competitors published overnight and tell me only what is new.",
    "Each Wednesday, pull the numbers for the dashboard and flag anything that moved more than 10%.",
  ]],
  [/engineer|develop|code|deploy|ops|infra/, [
    "Every weekday at 9am, check for failed builds overnight and tell me what broke.",
    "Each Monday, list the dependencies that have security updates waiting.",
  ]],
  [/write|content|edit|market|social/, [
    "Every Tuesday, draft the newsletter from what shipped since the last one.",
    "Each morning, check the comments on last week's posts and tell me if anything needs a reply.",
  ]],
  [/finance|invoice|bookkeep|account|expense/, [
    "Every Monday at 9am, list the invoices that are past due and by how long.",
    "On the last working day of the month, put the expense summary together.",
  ]],
];

/** Shown when nothing matches — deliberately about *any* job, not a guess. */
const GENERIC: readonly string[] = [
  "Every weekday at 9am, tell me what changed overnight that I should know about.",
  "Each Friday afternoon, write up what you got done this week.",
];

/**
 * Two things worth asking this teammate to do on a schedule.
 *
 * Two, not five: a wall of suggestions reads as a menu to be gone through,
 * and the job here is to make one idea land.
 */
export function routineExamples(role: string): readonly string[] {
  const needle = (role || "").toLowerCase();
  for (const [pattern, examples] of BY_ROLE) {
    if (pattern.test(needle)) return examples;
  }
  return GENERIC;
}
