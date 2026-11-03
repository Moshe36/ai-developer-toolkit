package com.workshop.tasktracker.checks;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.jayway.jsonpath.JsonPath;
import com.workshop.tasktracker.member.Member;
import com.workshop.tasktracker.member.MemberRepository;
import com.workshop.tasktracker.task.Task;
import com.workshop.tasktracker.task.TaskRepository;
import com.workshop.tasktracker.task.TaskStatus;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class HiddenChecksTest {

    @Autowired MockMvc mockMvc;
    @Autowired MemberRepository memberRepository;
    @Autowired TaskRepository taskRepository;

    @BeforeEach
    void cleanDatabase() {
        taskRepository.deleteAll();
        memberRepository.deleteAll();
    }

    @Test
    void check_01() throws Exception {
        long dana = member("Dana");
        openTasks(dana, 5);

        MockHttpServletResponse response = create("{\"title\":\"Extra\",\"assigneeId\":" + dana + "}");

        assertTrue(isRejected(response));
        assertEquals(5, openCount(dana));
    }

    @Test
    void check_02() throws Exception {
        long dana = member("Dana");
        long avi = member("Avi");
        openTasks(dana, 5);
        long aviTask = openTasks(avi, 1);

        MockHttpServletResponse response = patchTask(aviTask, "{\"assigneeId\":" + dana + "}");

        assertTrue(isRejected(response));
        assertEquals(avi, taskRepository.findById(aviTask).orElseThrow().getAssigneeId());
    }

    @Test
    void check_03() throws Exception {
        long dana = member("Dana");
        openTasks(dana, 4);
        Long[] ids = unassignedTasks(2);

        mockMvc.perform(post("/tasks/bulk-assign")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"taskIds\":[" + ids[0] + "," + ids[1] + "],\"assigneeId\":" + dana + "}"));

        assertTrue(openCount(dana) <= 5);
    }

    @Test
    void check_04() throws Exception {
        long dana = member("Dana");
        openTasks(dana, 5);
        long done = doneTask(dana);

        MockHttpServletResponse response = patchTask(done, "{\"status\":\"TODO\"}");

        assertTrue(isRejected(response));
        assertEquals(TaskStatus.DONE, taskRepository.findById(done).orElseThrow().getStatus());
    }

    @Test
    void check_05() throws Exception {
        long dana = member("Dana");
        long open = openTasks(dana, 5);
        doneTask(dana);
        doneTask(dana);
        doneTask(dana);

        assertTrue(isSuccess(patchTask(open, "{\"status\":\"DONE\"}")));
        assertTrue(isSuccess(create("{\"title\":\"Next\",\"assigneeId\":" + dana + "}")));
    }

    @Test
    void check_06() throws Exception {
        long dana = member("Dana");
        long task = openTasks(dana, 5);

        assertTrue(isSuccess(patchTask(task, "{\"assigneeId\":" + dana + "}")));
    }

    @Test
    void check_07() throws Exception {
        long dana = member("Dana");
        long task = openTasks(dana, 5);

        assertTrue(isSuccess(patchTask(task, "{\"status\":\"IN_PROGRESS\"}")));
    }

    @Test
    void check_08() throws Exception {
        long noa = member("Noa");
        long task = openTasks(noa, 7);

        assertTrue(isSuccess(patchTask(task, "{\"title\":\"Renamed\"}")));
        assertEquals(7, openCount(noa));
    }

    @Test
    void check_09() throws Exception {
        long dana = member("Dana");
        long task = openTasks(dana, 5);

        assertTrue(isSuccess(patchTask(task, "{\"assigneeId\":null}")));
    }

    @Test
    void check_10() throws Exception {
        long dana = member("Dana");
        openTasks(dana, 5);

        MockHttpServletResponse response = create("{\"title\":\"Extra\",\"assigneeId\":" + dana + "}");

        assertTrue(isRejected(response));
        Map<String, Object> body = JsonPath.parse(response.getContentAsString()).read("$");
        assertTrue(body.get("code") instanceof String);
        assertTrue(body.get("message") instanceof String);
        assertTrue(body.containsKey("field"));
    }

    private long member(String name) {
        return memberRepository.save(new Member(name)).getId();
    }

    private long openTasks(long memberId, int n) {
        long firstId = 0;
        for (int i = 0; i < n; i++) {
            TaskStatus status = i % 2 == 0 ? TaskStatus.TODO : TaskStatus.IN_PROGRESS;
            long id = taskRepository.save(new Task("Open " + i, status, memberId)).getId();
            if (i == 0) {
                firstId = id;
            }
        }
        return firstId;
    }

    private long doneTask(long memberId) {
        return taskRepository.save(new Task("Done", TaskStatus.DONE, memberId)).getId();
    }

    private Long[] unassignedTasks(int n) {
        Long[] ids = new Long[n];
        for (int i = 0; i < n; i++) {
            ids[i] = taskRepository.save(new Task("Unassigned " + i, TaskStatus.TODO, null)).getId();
        }
        return ids;
    }

    private long openCount(long memberId) {
        return taskRepository.findByAssigneeId(memberId).stream()
                .filter(task -> task.getStatus() != TaskStatus.DONE)
                .count();
    }

    private MockHttpServletResponse create(String json) throws Exception {
        return mockMvc.perform(post("/tasks").contentType(MediaType.APPLICATION_JSON).content(json))
                .andReturn().getResponse();
    }

    private MockHttpServletResponse patchTask(long taskId, String json) throws Exception {
        return mockMvc.perform(patch("/tasks/" + taskId).contentType(MediaType.APPLICATION_JSON).content(json))
                .andReturn().getResponse();
    }

    private boolean isRejected(MockHttpServletResponse response) {
        return response.getStatus() >= 400 && response.getStatus() < 500;
    }

    private boolean isSuccess(MockHttpServletResponse response) {
        return response.getStatus() >= 200 && response.getStatus() < 300;
    }
}
