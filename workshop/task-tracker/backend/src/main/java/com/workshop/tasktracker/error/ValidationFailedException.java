package com.workshop.tasktracker.error;

public class ValidationFailedException extends RuntimeException {

    private final String field;

    public ValidationFailedException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
