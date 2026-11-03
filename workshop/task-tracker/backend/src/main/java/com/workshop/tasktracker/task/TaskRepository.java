package com.workshop.tasktracker.task;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByAssigneeId(Long assigneeId);

    long countByAssigneeId(Long assigneeId);

    @Query("""
            select t from Task t
            where (:status is null or t.status = :status)
              and (:assigneeId is null or t.assigneeId = :assigneeId)
            """)
    Page<Task> search(@Param("status") TaskStatus status, @Param("assigneeId") Long assigneeId, Pageable pageable);
}
