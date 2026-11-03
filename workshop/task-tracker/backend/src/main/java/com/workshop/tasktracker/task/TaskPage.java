package com.workshop.tasktracker.task;

import java.util.List;

public record TaskPage(List<TaskResponse> items, long total) {
}
