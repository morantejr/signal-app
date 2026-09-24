.PHONY: setup test eval run langfuse langfuse-down

setup:
	uv sync --group dev

test:
	uv run pytest -q

eval:
	uv run pytest -q tests/test_evals.py -k eval

# Usage: make run TICKER=ZETA THESIS="AI ad demand keeps growing"
run:
	uv run python -m signal_research.run --ticker $(TICKER) $(if $(THESIS),--thesis "$(THESIS)",) $(if $(NO_LLM),--no-llm,)

# Self-hosted Langfuse (open source). Downloads the official compose file
# rather than shipping a stale copy; needs Docker.
langfuse:
	curl -fsSL https://raw.githubusercontent.com/langfuse/langfuse/main/docker-compose.yml -o infra/langfuse/docker-compose.yml
	docker compose -f infra/langfuse/docker-compose.yml up -d
	@echo "Langfuse at http://localhost:3000 — create a project, copy the keys into .env"

langfuse-down:
	docker compose -f infra/langfuse/docker-compose.yml down
