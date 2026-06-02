package com.demo.upimesh.config;

import com.demo.upimesh.service.MeshWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private MeshWebSocketHandler webSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Map the handler to /ws/events and allow connections from any origin
        registry.addHandler(webSocketHandler, "/ws/events").setAllowedOrigins("*");
    }
}
