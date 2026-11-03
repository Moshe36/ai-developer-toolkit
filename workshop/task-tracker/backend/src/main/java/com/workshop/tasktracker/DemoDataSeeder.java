package com.workshop.tasktracker;

import com.workshop.tasktracker.member.Member;
import com.workshop.tasktracker.member.MemberRepository;
import com.workshop.tasktracker.task.Task;
import com.workshop.tasktracker.task.TaskRepository;
import com.workshop.tasktracker.task.TaskStatus;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
public class DemoDataSeeder implements CommandLineRunner {

    private final MemberRepository memberRepository;
    private final TaskRepository taskRepository;

    public DemoDataSeeder(MemberRepository memberRepository, TaskRepository taskRepository) {
        this.memberRepository = memberRepository;
        this.taskRepository = taskRepository;
    }

    @Override
    public void run(String... args) {
        Long danaId = memberRepository.save(new Member("Dana")).getId();
        Long aviId = memberRepository.save(new Member("Avi")).getId();
        Long noaId = memberRepository.save(new Member("Noa")).getId();

        seedTasks(danaId, TaskStatus.TODO, "Dana open task ", 2);
        seedTasks(danaId, TaskStatus.IN_PROGRESS, "Dana in-progress task ", 2);
        seedTasks(danaId, TaskStatus.DONE, "Dana finished task ", 2);
        seedTasks(aviId, TaskStatus.TODO, "Avi open task ", 3);
        seedTasks(noaId, TaskStatus.TODO, "Noa open task ", 2);
        seedTasks(null, TaskStatus.TODO, "Unassigned task ", 3);
    }

    private void seedTasks(Long assigneeId, TaskStatus status, String titlePrefix, int count) {
        for (int number = 1; number <= count; number++) {
            taskRepository.save(new Task(titlePrefix + number, status, assigneeId));
        }
    }
}
