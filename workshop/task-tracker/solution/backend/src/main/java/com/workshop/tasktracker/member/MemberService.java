package com.workshop.tasktracker.member;

import com.workshop.tasktracker.task.TaskRepository;
import com.workshop.tasktracker.task.WorkloadPolicy;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final TaskRepository taskRepository;
    private final WorkloadPolicy workloadPolicy;

    public MemberService(
            MemberRepository memberRepository, TaskRepository taskRepository, WorkloadPolicy workloadPolicy) {
        this.memberRepository = memberRepository;
        this.taskRepository = taskRepository;
        this.workloadPolicy = workloadPolicy;
    }

    public List<MemberResponse> listMembers() {
        return memberRepository.findAll().stream().map(this::toResponse).toList();
    }

    public MemberResponse createMember(String name) {
        return toResponse(memberRepository.save(new Member(name)));
    }

    private MemberResponse toResponse(Member member) {
        return new MemberResponse(
                member.getId(),
                member.getName(),
                taskRepository.countByAssigneeId(member.getId()),
                workloadPolicy.countOpenTasks(member.getId()),
                workloadPolicy.openTaskLimit());
    }
}