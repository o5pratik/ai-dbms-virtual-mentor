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
