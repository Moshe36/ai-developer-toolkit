package com.workshop.tasktracker.task;

import com.workshop.tasktracker.error.MemberNotFoundException;
import com.workshop.tasktracker.error.TaskNotFoundException;
import com.workshop.tasktracker.member.MemberRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssignmentService {

    private final TaskRepository taskRepository;
    private final MemberRepository memberRepository;

    public AssignmentService(TaskRepository taskRepository, MemberRepository memberRepository) {
        this.taskRepository = taskRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional
    public Task createWithAssignee(String title, Long memberId) {
        if (memberId != null) {
            if (!memberRepository.existsById(memberId)) {
                throw new MemberNotFoundException(memberId);
            }
        }
        Task t = new Task(title, TaskStatus.TODO, memberId);
        return taskRepository.save(t);
    }

    @Transactional
    public Task reassign(Long taskId, Long memberId) {
        if (memberId != null) {
            if (!memberRepository.existsById(memberId)) {
                throw new MemberNotFoundException(memberId);
            }
        }
        Task t = taskRepository.findById(taskId).orElseThrow(() -> new TaskNotFoundException(taskId));
        return doAssignStuff(t, memberId);
    }

    @Transactional
    public List<Task> bulkAssign(List<Long> taskIds, Long memberId) {
        if (memberId != null) {
            if (!memberRepository.existsById(memberId)) {
                throw new MemberNotFoundException(memberId);
            }
        }
        List<Task> result = new ArrayList<>();
        for (Long id : taskIds) {
            Task t = taskRepository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
            result.add(doAssignStuff(t, memberId));
        }
        return result;
    }

    private Task doAssignStuff(Task t, Long memberId) {
        t.setAssigneeId(memberId);
        return taskRepository.save(t);
    }
}
