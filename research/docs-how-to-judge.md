# How to judge this system

This is an early research tool, not an oracle. Judge it on whether its structure
makes lying hard, not on whether its calls are right.

1. **Can the model move the number?** Run `make eval`. Cases
   `quant_unchanged_when_prompts_change`, `quant_unchanged_when_models_change` and
   `llm_cannot_set_or_adjust_score` feed hostile prompts and fake model output that
   tries to set `quant_score`. The persisted quant must not change.
2. **Do both sides exist?** Open `runs/<id>/result.json`: `bull` and `bear` are separate
   objects with their own claims and `steelman_of_other_side`. Synthesis refuses to run
   without both.
3. **Is disagreement visible?** `brief.disagreement` is computed in code from the quant
   band and the narrative lean. `agree=false` is an ordinary outcome, not an error.
4. **Are claims backed?** Every claim has `support` ∈ sourced / inference / unsupported
   and `source_ids`. `critic.sourced_share_high_conf` tells you how much of the confident
   material is actually cited; `dangling_source_ids` lists citations to nothing.
5. **Can you trace it?** `runs/<id>/trace.jsonl` lists every span and every OpenRouter
   generation with model id, provider, token usage and latency. With Langfuse configured
   the same appears there.

What it does not do yet: peer valuation, filing text retrieval into the evidence bundle,
prediction calibration, portfolio effects. Those are stubs or absent; see the README matrix.
