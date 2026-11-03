package com.workshop.tasktracker.member;

public record MemberResponse(Long id, String name, long assignedTaskCount) {
}
