package com.workshop.tasktracker;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.workshop.tasktracker.member.Member;
import com.workshop.tasktracker.member.MemberRepository;
import com.workshop.tasktracker.task.Task;
import com.workshop.tasktracker.task.TaskRepository;
import com.workshop.tasktracker.task.TaskStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MemberApiTest {

    @Autowired MockMvc mockMvc;
    @Autowired MemberRepository memberRepository;
    @Autowired TaskRepository taskRepository;

    @BeforeEach
    void cleanDatabase() {
        taskRepository.deleteAll();
        memberRepository.deleteAll();
    }

    @Test
    void countsAllAssignedTasks() throws Exception {
        Long memberId = memberRepository.save(new Member("Dana")).getId();
        taskRepository.save(new Task("one", TaskStatus.TODO, memberId));
        taskRepository.save(new Task("two", TaskStatus.TODO, memberId));
        taskRepository.save(new Task("three", TaskStatus.DONE, memberId));

        mockMvc.perform(get("/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Dana"))
                .andExpect(jsonPath("$[0].assignedTaskCount").value(3));
    }
}
