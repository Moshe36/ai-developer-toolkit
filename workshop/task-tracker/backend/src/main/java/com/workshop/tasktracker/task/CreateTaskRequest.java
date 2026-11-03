package com.workshop.tasktracker.task;

import jakarta.validation.constraints.NotBlank;

public record CreateTaskRequest(@NotBlank String title, Long assigneeId) {
}
