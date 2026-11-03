package com.workshop.tasktracker.error;

public class TaskNotFoundException extends RuntimeException {

    public TaskNotFoundException(Long taskId) {
        super("Task " + taskId + " not found");
    }
}
