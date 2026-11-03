package com.workshop.tasktracker.error;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(TaskNotFoundException.class)
    public ResponseEntity<ApiError> handleTaskNotFound(TaskNotFoundException e) {
        return respond(HttpStatus.NOT_FOUND, "TASK_NOT_FOUND", e.getMessage(), null);
    }

    @ExceptionHandler(MemberNotFoundException.class)
    public ResponseEntity<ApiError> handleMemberNotFound(MemberNotFoundException e) {
        return respond(HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND", e.getMessage(), null);
    }

    @ExceptionHandler(MemberTaskLimitException.class)
    public ResponseEntity<ApiError> handleMemberTaskLimit(MemberTaskLimitException e) {
        return respond(HttpStatus.CONFLICT, "MEMBER_TASK_LIMIT_REACHED", e.getMessage(), "assigneeId");
    }

    @ExceptionHandler(ValidationFailedException.class)
    public ResponseEntity<ApiError> handleValidationFailed(ValidationFailedException e) {
        return respond(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", e.getMessage(), e.getField());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleInvalidBody(MethodArgumentNotValidException e) {
        var fieldError = e.getBindingResult().getFieldError();
        String field = fieldError == null ? null : fieldError.getField();
        String message = fieldError == null ? "Invalid request" : fieldError.getDefaultMessage();
        return respond(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message, field);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleBadParameter(MethodArgumentTypeMismatchException e) {
        return respond(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Invalid value for " + e.getName(), e.getName());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableBody(HttpMessageNotReadableException e) {
        return respond(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Malformed request body", null);
    }

    private ResponseEntity<ApiError> respond(HttpStatus status, String code, String message, String field) {
        return ResponseEntity.status(status).body(new ApiError(code, message, field));
    }
}
