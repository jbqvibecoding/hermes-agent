from __future__ import annotations

from tools import workflow_eee as eee


def _goal():
    return eee.ExplorationGoal(description="grow signups 30%", constraints=["no paid ads"])


def _opt(id, **over):
    base = dict(id=id, title=id.title(), approach="...", estimated_tokens=1000)
    base.update(over)
    return eee.ExplorationOption(**base)


def test_allocate_budget_splits():
    b = eee.allocate_budget(10000)
    assert b == {"explore": 3000, "evaluate": 1000, "execute": 6000}


def test_overall_score_inverts_risk_and_cost():
    good = eee.EvaluationScore(feasibility=1, impact=1, risk=0, cost=0)
    bad = eee.EvaluationScore(feasibility=0, impact=0, risk=1, cost=1)
    assert eee.overall_score(good) == 1.0
    assert eee.overall_score(bad) == 0.0


def test_evaluate_sorts_best_first():
    options = [_opt("a"), _opt("b")]

    def scorer(goal, o):
        if o.id == "a":
            return eee.EvaluationScore(feasibility=0.9, impact=0.9, risk=0.1, cost=0.1)
        return eee.EvaluationScore(feasibility=0.3, impact=0.3, risk=0.6, cost=0.6)

    ev = eee.evaluate(_goal(), options, scorer)
    assert [e.option.id for e in ev] == ["a", "b"]
    assert ev[0].overall > ev[1].overall


def test_decide_confident():
    ev = [eee.EvaluatedOption(_opt("a"), eee.EvaluationScore(0.9, 0.9, 0.1, 0.1), 0.85)]
    selected, needs_approval, reason = eee.decide(ev)
    assert selected.option.id == "a"
    assert needs_approval is False


def test_decide_low_confidence_requires_approval():
    ev = [eee.EvaluatedOption(_opt("a"), eee.EvaluationScore(0.4, 0.4, 0.2, 0.2), 0.5)]
    _, needs_approval, reason = eee.decide(ev, confidence_threshold=0.7)
    assert needs_approval is True
    assert "confidence" in reason


def test_decide_high_risk_requires_approval_even_if_confident():
    # overall clears threshold but risk hits the ceiling → still gated.
    ev = [eee.EvaluatedOption(_opt("a"), eee.EvaluationScore(1.0, 1.0, 0.8, 0.0), 0.76)]
    _, needs_approval, reason = eee.decide(ev, confidence_threshold=0.7, risk_ceiling=0.7)
    assert needs_approval is True
    assert "risk" in reason


def test_decide_no_options():
    selected, needs_approval, reason = eee.decide([])
    assert selected is None and needs_approval is True


def test_run_eee_confident_plans():
    def explorer(goal):
        return [_opt("a"), _opt("b")]

    def scorer(goal, o):
        return eee.EvaluationScore(feasibility=0.9, impact=0.9, risk=0.1, cost=0.1)

    def planner(option):
        return eee.ExecutionPlan(
            option_id=option.id,
            steps=[eee.PlannedStep(title="do it", capability_needs=["x"])],
            total_estimated_tokens=500,
        )

    res = eee.run_eee(_goal(), explorer=explorer, scorer=scorer, planner=planner)
    assert res.requires_human_approval is False
    assert res.selected_option_id == "a"
    assert res.plan is not None and res.plan.steps[0].title == "do it"


def test_run_eee_low_confidence_no_plan():
    planner_called = []

    def explorer(goal):
        return [_opt("a")]

    def scorer(goal, o):
        return eee.EvaluationScore(feasibility=0.3, impact=0.3, risk=0.3, cost=0.3)

    def planner(option):  # must NOT run when approval is required
        planner_called.append(option.id)
        return eee.ExecutionPlan(option_id=option.id)

    res = eee.run_eee(_goal(), explorer=explorer, scorer=scorer, planner=planner)
    assert res.requires_human_approval is True
    assert res.plan is None
    assert planner_called == []


def test_run_eee_no_options():
    res = eee.run_eee(
        _goal(),
        explorer=lambda g: [],
        scorer=lambda g, o: eee.EvaluationScore(),
        planner=lambda o: eee.ExecutionPlan(option_id=o.id),
    )
    assert res.selected_option_id is None
    assert res.requires_human_approval is True
    assert res.plan is None
