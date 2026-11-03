package com.workshop.tasktracker;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.workshop.tasktracker.member.Member;
import com.workshop.tasktracker.member.MemberRepository;
import com.workshop.tasktracker.task.TaskRepository;
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
class TaskApiTest {

    @Autowired MockMvc mockMvc;
    @Autowired MemberRepository memberRepository;
    @Autowired TaskRepository taskRepository;

    private Long memberId;

    @BeforeEach
    void cleanDatabaseAndCreateMember() {
        taskRepository.deleteAll();
        memberRepository.deleteAll();
        memberId = memberRepository.save(new Member("Dana")).getId();
    }

    @Test
    void createsTaskAsTodo() throws Exception {
        createTask("{\"title\":\"Write docs\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("TODO"));
    }

    @Test
    void assignsOnCreate() throws Exception {
        createTask("{\"title\":\"Write docs\",\"assigneeId\":" + memberId + "}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assigneeId").value(memberId));
    }

    @Test
    void patchTitleKeepsAssignee() throws Exception {
        long taskId = createTaskAndReturnId("{\"title\":\"Old\",\"assigneeId\":" + memberId + "}");

        patchTask(taskId, "{\"title\":\"New\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New"))
                .andExpect(jsonPath("$.assigneeId").value(memberId));
    }

    @Test
    void patchNullAssigneeUnassigns() throws Exception {
        long taskId = createTaskAndReturnId("{\"title\":\"Old\",\"assigneeId\":" + memberId + "}");

        patchTask(taskId, "{\"assigneeId\":null}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assigneeId").value(nullValue()));
    }

    @Test
    void reopensDoneTask() throws Exception {
        long taskId = createTaskAndReturnId("{\"title\":\"Finish\",\"assigneeId\":" + memberId + "}");

        patchTask(taskId, "{\"status\":\"DONE\"}").andExpect(jsonPath("$.status").value("DONE"));
        patchTask(taskId, "{\"status\":\"TODO\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("TODO"));
    }

    @Test
    void bulkAssignsAll() throws Exception {
        long first = createTaskAndReturnId("{\"title\":\"A\"}");
        long second = createTaskAndReturnId("{\"title\":\"B\"}");
        long third = createTaskAndReturnId("{\"title\":\"C\"}");

        mockMvc.perform(post("/tasks/bulk-assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskIds\":[" + first + "," + second + "," + third + "],\"assigneeId\":" + memberId + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].assigneeId").value(memberId))
                .andExpect(jsonPath("$[1].assigneeId").value(memberId))
                .andExpect(jsonPath("$[2].assigneeId").value(memberId));
    }

    @Test
    void filtersByStatusAndSortsByTitle() throws Exception {
        createTask("{\"title\":\"Charlie\"}");
        createTask("{\"title\":\"Alpha\"}");
        long doneId = createTaskAndReturnId("{\"title\":\"Bravo\"}");
        patchTask(doneId, "{\"status\":\"DONE\"}");
        createTask("{\"title\":\"Beta\"}");

        mockMvc.perform(get("/tasks").param("status", "TODO").param("sort", "title"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.items[0].title").value("Alpha"))
                .andExpect(jsonPath("$.items[1].title").value("Beta"))
                .andExpect(jsonPath("$.items[2].title").value("Charlie"));
    }

    @Test
    void unknownTaskReturns404Envelope() throws Exception {
        patchTask(999_999, "{\"title\":\"x\"}")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TASK_NOT_FOUND"))
                .andExpect(jsonPath("$.field").value(nullValue()));
    }

    private ResultActions createTask(String json) throws Exception {
        return mockMvc.perform(post("/tasks").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private long createTaskAndReturnId(String json) throws Exception {
        String body = createTask(json).andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.parse(body).read("$.id", Long.class);
    }

    private ResultActions patchTask(long taskId, String json) throws Exception {
        return mockMvc.perform(patch("/tasks/" + taskId).contentType(MediaType.APPLICATION_JSON).content(json));
    }
}
