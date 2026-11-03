package com.workshop.tasktracker.error;

public class MemberNotFoundException extends RuntimeException {

    public MemberNotFoundException(Long memberId) {
        super("Member " + memberId + " not found");
    }
}
