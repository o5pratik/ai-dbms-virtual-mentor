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
