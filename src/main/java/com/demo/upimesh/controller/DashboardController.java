package com.demo.upimesh.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    @GetMapping(value = {
        "/",
        "/landing",
        "/dashboard",
        "/visualizer",
        "/ledger",
        "/security",
        "/analytics"
    })
    public String index() {
        // Forward to the static index.html built from the React application
        return "forward:/index.html";
    }
}
