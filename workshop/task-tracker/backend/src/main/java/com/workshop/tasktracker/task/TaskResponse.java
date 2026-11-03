package com.workshop.tasktracker.task;

import java.time.Instant;

public record TaskResponse(Long id, String title, TaskStatus status, Long assigneeId, Instant createdAt) {

    public static TaskResponse from(Task task) {
        return new TaskResponse(task.getId(), task.getTitle(), task.getStatus(), task.getAssigneeId(), task.getCreatedAt());
    }
}
