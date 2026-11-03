package com.workshop.tasktracker.error;

public record ApiError(String code, String message, String field) {
}
