package com.workshop.tasktracker.error;

public class MemberTaskLimitException extends RuntimeException {

    public MemberTaskLimitException(String memberName, long openTaskCount, int limit) {
        super(memberName + " already has " + openTaskCount + " open tasks (limit " + limit + ").");
    }
}