package com.workshop.tasktracker;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenTaskLimitApiTest {

    private static final int LIMIT = 5;

    @Autowired MockMvc mockMvc;
    @Autowired MemberRepository memberRepository;
    @Autowired TaskRepository taskRepository;

    private Long danaId;

    @BeforeEach
    void cleanDatabaseAndCreateMember() {
        taskRepository.deleteAll();
        memberRepository.deleteAll();
        danaId = memberRepository.save(new Member("Dana")).getId();
    }

    @Test
    void rejectsCreateWhenMemberIsAtLimit() throws Exception {
        saveOpenTasks(danaId, LIMIT);

        perform(post("/tasks"), "{\"title\":\"Extra\",\"assigneeId\":" + danaId + "}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MEMBER_TASK_LIMIT_REACHED"))
                .andExpect(jsonPath("$.message").value("Dana already has 5 open tasks (limit 5)."))
                .andExpect(jsonPath("$.field").value("assigneeId"));
    }

    @Test
    void allowsCreateWhenOnlyDoneTasksPushCountOverLimit() throws Exception {
        saveOpenTasks(danaId, LIMIT - 1);
        saveTask(danaId, TaskStatus.DONE);
        saveTask(danaId, TaskStatus.DONE);

        perform(post("/tasks"), "{\"title\":\"Fits\",\"assigneeId\":" + danaId + "}")
                .andExpect(status().isCreated());
    }

    @Test
    void rejectsReassignToMemberAtLimit() throws Exception {
        saveOpenTasks(danaId, LIMIT);
        Long avisTask = saveTask(null, TaskStatus.TODO);

        perform(patch("/tasks/" + avisTask), "{\"assigneeId\":" + danaId + "}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MEMBER_TASK_LIMIT_REACHED"));
    }

    @Test
    void allowsReassignToCurrentAssigneeWhenAtLimit() throws Exception {
        Long task = saveOpenTasks(danaId, LIMIT);

        perform(patch("/tasks/" + task), "{\"assigneeId\":" + danaId + "}")
                .andExpect(status().isOk());
    }

    @Test
    void rejectsReopeningDoneTaskWhenAssigneeIsAtLimit() throws Exception {
        saveOpenTasks(danaId, LIMIT);
        Long doneTask = saveTask(danaId, TaskStatus.DONE);

        perform(patch("/tasks/" + doneTask), "{\"status\":\"TODO\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MEMBER_TASK_LIMIT_REACHED"));
    }

    @Test
    void allowsStartingATaskWhenAtLimit() throws Exception {
        Long task = saveOpenTasks(danaId, LIMIT);

        perform(patch("/tasks/" + task), "{\"status\":\"IN_PROGRESS\"}")
                .andExpect(status().isOk());
    }

    @Test
    void bulkAssignCountsOnlyTasksThatAddLoad() throws Exception {
        Long ownTask = saveOpenTasks(danaId, LIMIT - 1);
        Long unassigned = saveTask(null, TaskStatus.TODO);
        Long done = saveTask(null, TaskStatus.DONE);

        perform(post("/tasks/bulk-assign"), bulkBody(danaId, ownTask, unassigned, done))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)));
    }

    @Test
    void listsOpenTaskCountAndLimitForMembers() throws Exception {
        saveOpenTasks(danaId, 3);
        saveTask(danaId, TaskStatus.DONE);

        mockMvc.perform(get("/members"))
                .andExpect(jsonPath("$[0].assignedTaskCount").value(4))
                .andExpect(jsonPath("$[0].openTaskCount").value(3))
                .andExpect(jsonPath("$[0].openTaskLimit").value(LIMIT));
    }

    @Test
    void bulkAssignStopsAtLimitAndSkipsTheRest() throws Exception {
        saveOpenTasks(danaId, LIMIT - 1);
        Long first = saveTask(null, TaskStatus.TODO);
        Long second = saveTask(null, TaskStatus.TODO);

        perform(post("/tasks/bulk-assign"), bulkBody(danaId, first, second))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(first));

        org.junit.jupiter.api.Assertions.assertNull(taskRepository.findById(second).orElseThrow().getAssigneeId());
    }
    private ResultActions perform(
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request, String json)
            throws Exception {
        return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String bulkBody(Long assigneeId, Long... taskIds) {
        String ids = String.join(",", java.util.Arrays.stream(taskIds).map(String::valueOf).toList());
        return "{\"taskIds\":[" + ids + "],\"assigneeId\":" + assigneeId + "}";
    }

    private Long saveOpenTasks(Long memberId, int count) {
        Long firstId = null;
        for (int i = 0; i < count; i++) {
            Long id = saveTask(memberId, TaskStatus.TODO);
            firstId = firstId == null ? id : firstId;
        }
        return firstId;
    }

    private Long saveTask(Long memberId, TaskStatus status) {
        return taskRepository.save(new Task("Task", status, memberId)).getId();
    }
}