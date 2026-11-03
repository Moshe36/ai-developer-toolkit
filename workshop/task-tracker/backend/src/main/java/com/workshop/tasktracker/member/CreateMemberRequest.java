package com.workshop.tasktracker.member;

import jakarta.validation.constraints.NotBlank;

public record CreateMemberRequest(@NotBlank String name) {
}
