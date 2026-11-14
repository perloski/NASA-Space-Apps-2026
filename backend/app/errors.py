"""Errores con el formato del contrato: {"error": {"code", "message"}}."""
from __future__ import annotations

STATUS = {
    "BAD_PARAMS": 400,
    "NO_COVERAGE": 404,
    "UPSTREAM_TIMEOUT": 504,
    "INTERNAL": 500,
}


class ApiError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message

    @property
    def status(self) -> int:
        return STATUS.get(self.code, 500)

    def body(self) -> dict:
        return {"error": {"code": self.code, "message": self.message}}


def bad_params(msg: str) -> ApiError:
    return ApiError("BAD_PARAMS", msg)


def no_coverage(msg: str = "SPHEREx todavía no observó estas coordenadas.") -> ApiError:
    return ApiError("NO_COVERAGE", msg)


def upstream_timeout(service: str) -> ApiError:
    return ApiError("UPSTREAM_TIMEOUT", f"{service} no respondió a tiempo. Probá de nuevo en unos segundos.")
