package com.workshop.tasktracker.task;

import com.workshop.tasktracker.error.MemberNotFoundException;
import com.workshop.tasktracker.error.MemberTaskLimitException;
import com.workshop.tasktracker.member.Member;
import com.workshop.tasktracker.member.MemberRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class WorkloadPolicy {

    private final TaskRepository taskRepository;
    private final MemberRepository memberRepository;
    private final int maxOpenTasksPerMember;

    public WorkloadPolicy(
            TaskRepository taskRepository,
            MemberRepository memberRepository,
            @Value("${tasks.max-open-per-member:5}") int maxOpenTasksPerMember) {
        this.taskRepository = taskRepository;
        this.memberRepository = memberRepository;
        this.maxOpenTasksPerMember = maxOpenTasksPerMember;
    }

    public void ensureCanTakeOpenTasks(Long memberId, int additionalOpenTasks) {
        if (additionalOpenTasks <= 0) {
            return;
        }
        long openTasks = countOpenTasks(memberId);
        if (openTasks + additionalOpenTasks > maxOpenTasksPerMember) {
            throw new MemberTaskLimitException(findMemberName(memberId), openTasks, maxOpenTasksPerMember);
        }
    }

    public int remainingCapacity(Long memberId) {
        return (int) Math.max(0, maxOpenTasksPerMember - countOpenTasks(memberId));
    }

    public long countOpenTasks(Long memberId) {
        return taskRepository.countByAssigneeIdAndStatusNot(memberId, TaskStatus.DONE);
    }

    public int openTaskLimit() {
        return maxOpenTasksPerMember;
    }

    private String findMemberName(Long memberId) {
        return memberRepository.findById(memberId).map(Member::getName)
                .orElseThrow(() -> new MemberNotFoundException(memberId));
    }
}