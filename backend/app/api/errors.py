import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class APIError(Exception):

  def __init__(self, status_code: int, code: str, message: str):
    super().__init__(message)
    self.status_code = status_code
    self.code = code
    self.message = message


def _error_body(code: str, message: str) -> dict[str, Any]:
  return {"error": {"code": code, "message": message}}


def register_exception_handlers(app: FastAPI) -> None:

  @app.exception_handler(APIError)
  async def handle_api_error(_: Request, error: APIError) -> JSONResponse:
    return JSONResponse(status_code=error.status_code,
                        content=_error_body(error.code, error.message))

  @app.exception_handler(RequestValidationError)
  async def handle_validation_error(
      _: Request, __: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=400,
                        content=_error_body("INVALID_PARAMETER",
                                            "Invalid parameter."))

  @app.exception_handler(StarletteHTTPException)
  async def handle_http_error(_: Request,
                              error: StarletteHTTPException) -> JSONResponse:
    if error.status_code == 404:
      code = "NOT_FOUND"
      message = "Not found."
    elif error.status_code == 405:
      code = "METHOD_NOT_ALLOWED"
      message = "Method not allowed."
    elif 400 <= error.status_code < 500:
      code = "INVALID_PARAMETER"
      message = "Invalid request."
    else:
      code = "INTERNAL_ERROR"
      message = "Internal server error."

    return JSONResponse(status_code=error.status_code,
                        content=_error_body(code, message))

  @app.exception_handler(PyMongoError)
  async def handle_database_error(_: Request,
                                  error: PyMongoError) -> JSONResponse:
    logger.warning("MongoDB request failed (%s).", type(error).__name__)

    return JSONResponse(status_code=503,
                        content=_error_body(
                            "DATABASE_ERROR",
                            "Database temporarily unavailable."))

  @app.exception_handler(Exception)
  async def handle_internal_error(_: Request,
                                  error: Exception) -> JSONResponse:
    logger.error("Unhandled API error (%s).", type(error).__name__)

    return JSONResponse(status_code=500,
                        content=_error_body("INTERNAL_ERROR",
                                            "Internal server error."))
