package com.workshop.tasktracker.task;

import com.workshop.tasktracker.error.TaskNotFoundException;
import com.workshop.tasktracker.error.ValidationFailedException;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {

    private static final Set<String> SORTABLE_FIELDS = Set.of("createdAt", "title");
    private static final int MAX_PAGE_SIZE = 100;

    private final TaskRepository taskRepository;
    private final AssignmentService assignmentService;
    private final WorkloadPolicy workloadPolicy;

    public TaskService(
            TaskRepository taskRepository, AssignmentService assignmentService, WorkloadPolicy workloadPolicy) {
        this.taskRepository = taskRepository;
        this.assignmentService = assignmentService;
        this.workloadPolicy = workloadPolicy;
    }

    @Transactional
    public TaskResponse createTask(CreateTaskRequest request) {
        return TaskResponse.from(assignmentService.createWithAssignee(request.title(), request.assigneeId()));
    }

    @Transactional
    public TaskResponse updateTask(Long taskId, TaskPatch patch) {
        Task task = findTask(taskId);
        if (patch.hasTitle()) {
            task.setTitle(patch.title());
        }
        if (patch.hasStatus()) {
            ensureReopeningIsAllowed(task, patch);
            task.setStatus(patch.status());
        }
        if (patch.hasAssigneeId()) {
            task = assignmentService.reassign(taskId, patch.assigneeId());
        }
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public List<TaskResponse> bulkAssign(BulkAssignRequest request) {
        return assignmentService.bulkAssign(request.taskIds(), request.assigneeId()).stream()
                .map(TaskResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskPage listTasks(TaskStatus status, Long assigneeId, String sortField, int page, int size) {
        Page<Task> tasks = taskRepository.search(status, assigneeId, pageRequestFor(sortField, page, size));
        return new TaskPage(tasks.map(TaskResponse::from).getContent(), tasks.getTotalElements());
    }

    private PageRequest pageRequestFor(String sortField, int page, int size) {
        if (!SORTABLE_FIELDS.contains(sortField)) {
            throw new ValidationFailedException("sort", "sort must be one of createdAt, title");
        }
        if (page < 0) {
            throw new ValidationFailedException("page", "page must not be negative");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new ValidationFailedException("size", "size must be between 1 and " + MAX_PAGE_SIZE);
        }
        return PageRequest.of(page, size, Sort.by(sortField).ascending().and(Sort.by("id")));
    }

    private void ensureReopeningIsAllowed(Task task, TaskPatch patch) {
        boolean isReopening = task.getStatus() == TaskStatus.DONE && patch.status() != TaskStatus.DONE;
        Long assigneeAfterPatch = patch.hasAssigneeId() ? patch.assigneeId() : task.getAssigneeId();
        if (isReopening && assigneeAfterPatch != null) {
            workloadPolicy.ensureCanTakeOpenTasks(assigneeAfterPatch, 1);
        }
    }

    private Task findTask(Long taskId) {
        return taskRepository.findById(taskId).orElseThrow(() -> new TaskNotFoundException(taskId));
    }
}
