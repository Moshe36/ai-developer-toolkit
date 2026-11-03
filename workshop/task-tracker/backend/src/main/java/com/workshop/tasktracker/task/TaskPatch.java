package com.workshop.tasktracker.task;

import com.fasterxml.jackson.databind.JsonNode;
import com.workshop.tasktracker.error.ValidationFailedException;

/** A partial task update that distinguishes an absent key from an explicit JSON null. */
public final class TaskPatch {

    private final JsonNode body;

    private TaskPatch(JsonNode body) {
        this.body = body;
    }

    public static TaskPatch from(JsonNode body) {
        if (body == null || !body.isObject()) {
            throw new ValidationFailedException(null, "Request body must be a JSON object");
        }
        return new TaskPatch(body);
    }

    public boolean hasTitle() {
        return body.has("title");
    }

    public boolean hasStatus() {
        return body.has("status");
    }

    public boolean hasAssigneeId() {
        return body.has("assigneeId");
    }

    public String title() {
        JsonNode title = body.get("title");
        if (!title.isTextual() || title.asText().isBlank()) {
            throw new ValidationFailedException("title", "title must not be blank");
        }
        return title.asText();
    }

    public TaskStatus status() {
        JsonNode status = body.get("status");
        try {
            return TaskStatus.valueOf(status.asText());
        } catch (IllegalArgumentException e) {
            throw new ValidationFailedException("status", "status must be one of TODO, IN_PROGRESS, DONE");
        }
    }

    /** Returns the new assignee id, or null when the patch explicitly unassigns. */
    public Long assigneeId() {
        JsonNode assigneeId = body.get("assigneeId");
        if (assigneeId.isNull()) {
            return null;
        }
        if (!assigneeId.canConvertToLong()) {
            throw new ValidationFailedException("assigneeId", "assigneeId must be a number or null");
        }
        return assigneeId.asLong();
    }
}
