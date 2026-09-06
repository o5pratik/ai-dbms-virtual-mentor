from typing import Literal

from pydantic import BaseModel, Field, field_validator


class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=10_000)

    @field_validator("query")
    @classmethod
    def query_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Query must not be blank.")
        return value.strip()


class QueryResponse(BaseModel):
    success: bool
    columns: list[str]
    rows: list[list[str | int | float | None]]
    row_count: int
    execution_time: float
    error: str | None = None


class ExplainRequest(BaseModel):
    query: str = Field(min_length=1, max_length=10_000)
    result_summary: str = Field(default="", max_length=2_000)


class SuggestRequest(BaseModel):
    current_sql: str = Field(default="", max_length=10_000)
    instruction: str = Field(default="", max_length=1_000)


class FixRequest(BaseModel):
    query: str = Field(min_length=1, max_length=10_000)
    database_error: str = Field(default="", max_length=2_000)
    mode: Literal["playground", "write-lab"] = "playground"
    schema: str = Field(default="", max_length=12_000)


class SaveQueryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    query: str = Field(min_length=1, max_length=10_000)


class DeleteSavedRequest(BaseModel):
    id: int = Field(gt=0)


class ProgressRequest(BaseModel):
    topic_id: str = Field(min_length=1, max_length=80)
    completed: bool


class ChallengeProgressEntry(BaseModel):
    challenge_id: str = Field(min_length=1, max_length=80)
    attempts: int = Field(ge=0)
    failed_attempts: int = Field(ge=0)
    passed: bool
    passed_at: int | None = Field(default=None, gt=0)

    @field_validator("failed_attempts")
    @classmethod
    def failures_must_not_exceed_attempts(cls, value: int, info) -> int:
        attempts = info.data.get("attempts")
        if isinstance(attempts, int) and value > attempts:
            raise ValueError("failed_attempts cannot exceed attempts")
        return value


class ChallengeProgressSyncRequest(BaseModel):
    entries: list[ChallengeProgressEntry] = Field(max_length=100)


class SchemaAnalyzeRequest(BaseModel):
    sql: str = Field(min_length=1, max_length=50_000)
