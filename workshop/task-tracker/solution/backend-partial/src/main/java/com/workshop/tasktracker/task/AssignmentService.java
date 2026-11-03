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
    private final WorkloadPolicy workloadPolicy;

    public AssignmentService(
            TaskRepository taskRepository, MemberRepository memberRepository, WorkloadPolicy workloadPolicy) {
        this.taskRepository = taskRepository;
        this.memberRepository = memberRepository;
        this.workloadPolicy = workloadPolicy;
    }

    @Transactional
    public Task createWithAssignee(String title, Long memberId) {
        if (memberId != null) {
            if (!memberRepository.existsById(memberId)) {
                throw new MemberNotFoundException(memberId);
            }
            workloadPolicy.ensureCanTakeOpenTasks(memberId, 1);
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
        if (addsOpenTaskTo(t, memberId)) {
            workloadPolicy.ensureCanTakeOpenTasks(memberId, 1);
        }
        return doAssignStuff(t, memberId);
    }

    @Transactional
    public List<Task> bulkAssign(List<Long> taskIds, Long memberId) {
        if (memberId != null) {
            if (!memberRepository.existsById(memberId)) {
                throw new MemberNotFoundException(memberId);
            }
        }
        List<Task> tasks = findTasks(taskIds);
        int remainingCapacity = memberId == null ? 0 : workloadPolicy.remainingCapacity(memberId);
        List<Task> result = new ArrayList<>();
        for (Task t : tasks) {
            if (addsOpenTaskTo(t, memberId)) {
                if (remainingCapacity == 0) {
                    continue;
                }
                remainingCapacity--;
            }
            result.add(doAssignStuff(t, memberId));
        }
        return result;
    }

    private List<Task> findTasks(List<Long> taskIds) {
        return taskIds.stream()
                .map(id -> taskRepository.findById(id).orElseThrow(() -> new TaskNotFoundException(id)))
                .distinct()
                .toList();
    }

    private boolean addsOpenTaskTo(Task task, Long memberId) {
        return memberId != null
                && task.getStatus() != TaskStatus.DONE
                && !memberId.equals(task.getAssigneeId());
    }
    private Task doAssignStuff(Task t, Long memberId) {
        t.setAssigneeId(memberId);
        return taskRepository.save(t);
    }
}
