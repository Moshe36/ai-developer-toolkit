package com.workshop.tasktracker.task;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BulkAssignRequest(@NotEmpty List<Long> taskIds, @NotNull Long assigneeId) {
}
