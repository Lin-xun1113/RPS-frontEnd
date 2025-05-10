import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

const CrownSnowfall = () => {
  const sceneRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const runnerRef = useRef(null);
  const mouseConstraintRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  
  // 初始化物理引擎
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // 解构Matter.js模块
    const { Engine, Render, Runner, Bodies, Composite, Body } = Matter;
    
    // 获取容器尺寸
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    
    // 创建引擎
    const engine = Engine.create({
      gravity: { x: 0, y: 0.2 }
    });
    engineRef.current = engine;
    
    // 创建渲染器
    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: containerWidth,
        height: containerHeight,
        wireframes: false,
        background: 'transparent',
      }
    });
    renderRef.current = render;
    
    // 添加墙壁（边界）
    const wallOptions = { isStatic: true, render: { visible: false } };
    const ground = Bodies.rectangle(containerWidth / 2, containerHeight + 50, containerWidth * 2, 100, wallOptions);
    const leftWall = Bodies.rectangle(-50, containerHeight / 2, 100, containerHeight * 2, wallOptions);
    const rightWall = Bodies.rectangle(containerWidth + 50, containerHeight / 2, 100, containerHeight * 2, wallOptions);
    
    Composite.add(engine.world, [ground, leftWall, rightWall]);
    
    // 启动物理引擎和渲染
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);
    Render.run(render);
    
    // 初始化完成
    setIsReady(true);
    
    // 清理函数
    return () => {
      // 停止渲染和引擎
      if (renderRef.current) {
        Render.stop(renderRef.current);
        renderRef.current.canvas.remove();
        renderRef.current = null;
      }
      
      if (runnerRef.current) {
        Runner.stop(runnerRef.current);
        runnerRef.current = null;
      }
      
      if (engineRef.current) {
        Engine.clear(engineRef.current);
        engineRef.current = null;
      }
      
      setIsReady(false);
    };
  }, []);
  
  // 创建并管理皇冠
  useEffect(() => {
    if (!isReady || !engineRef.current) return;
    
    const { Bodies, Composite, Body } = Matter;
    const containerWidth = window.innerWidth;
    
    // 创建皇冠的函数
    const createCrown = () => {
      // 随机位置和属性
      const x = Math.random() * (containerWidth - 100) + 50;
      const y = -50;
      const size = Math.random() * 3 + 2; // 小一点的皇冠
      const angle = Math.random() * Math.PI * 2;
      
      // 创建皇冠物体
      const crown = Bodies.rectangle(x, y, size, size, {
        frictionAir: 0.05,
        restitution: 0.6,
        density: 0.001,
        angle: angle,
        label: 'crown', // 添加标签便于识别
        render: {
          sprite: {
            texture: '/images/win-icon.png',
            xScale: size / 100,
            yScale: size / 100
          }
        }
      });
      
      // 设置旋转速度
      Body.setAngularVelocity(crown, (Math.random() - 0.5) * 0.05);
      
      // 添加到物理世界 - 增加空值检查
      if (engineRef.current && engineRef.current.world) {
        Composite.add(engineRef.current.world, crown);
      } else {
        return; // 如果物理引擎不可用，直接返回不创建皇冠
      }
      
      // 设置超时消失
      setTimeout(() => {
        const fadeEffect = setInterval(() => {
          if (crown.render && crown.render.opacity > 0.1 && 
              engineRef.current && 
              engineRef.current.world.bodies.includes(crown)) {
            crown.render.opacity -= 0.05;
          } else {
            clearInterval(fadeEffect);
            if (engineRef.current && engineRef.current.world.bodies.includes(crown)) {
              Composite.remove(engineRef.current.world, crown);
            }
          }
        }, 100);
      }, 20000);
    };
    
    // 初始生成几个皇冠
    for (let i = 0; i < 10; i++) {
      setTimeout(() => createCrown(), i * 200);
    }
    
    // 持续生成皇冠
    const interval = setInterval(createCrown, 400);
    
    // 清理
    return () => {
      clearInterval(interval);
    };
  }, [isReady]);
  
  // 添加鼠标交互功能
  useEffect(() => {
    if (!isReady || !engineRef.current || !renderRef.current) return;
    
    const { Mouse, MouseConstraint, Events, Composite } = Matter;
    
    try {
      // 创建鼠标交互
      const mouse = Mouse.create(renderRef.current.canvas);
      const mouseConstraint = MouseConstraint.create(engineRef.current, {
        mouse: mouse,
        constraint: {
          stiffness: 0.6,
          render: { visible: false }
        }
      });
      
      // 关键改进：覆盖默认的鼠标滚轮事件
      mouse.element.removeEventListener('mousewheel', mouse.mousewheel);
      mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);
      
      // 添加自定义滚轮处理
      const handleWheel = (e) => {
        // 仅更新鼠标位置而不阻止默认滚动
        const position = Mouse._getRelativeMousePosition(e, mouse.element, mouse.pixelRatio);
        mouse.absolute.x = position.x;
        mouse.absolute.y = position.y;
        mouse.position.x = mouse.absolute.x * mouse.scale.x + mouse.offset.x;
        mouse.position.y = mouse.absolute.y * mouse.scale.y + mouse.offset.y;
        mouse.wheelDelta = Math.max(-1, Math.min(1, e.wheelDelta || -e.detail));
      };
      
      // 添加新的滚轮监听器
      mouse.element.addEventListener('mousewheel', handleWheel, { passive: true });
      mouse.element.addEventListener('DOMMouseScroll', handleWheel, { passive: true });
      
      Composite.add(engineRef.current.world, mouseConstraint);
      mouseConstraintRef.current = mouseConstraint;
      
      // 修复渲染器的鼠标对象
      renderRef.current.mouse = mouse;
      
      // 清理鼠标交互
      return () => {
        if (mouseConstraintRef.current && engineRef.current) {
          Composite.remove(engineRef.current.world, mouseConstraintRef.current);
          mouseConstraintRef.current = null;
        }
      };
    } catch (error) {
      console.error('初始化鼠标交互出错:', error);
    }
  }, [isReady]);
  
  // 无障碍元素调整大小
  useEffect(() => {
    if (!renderRef.current) return;
    
    const handleResize = () => {
      const { Render } = Matter;
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      
      if (renderRef.current) {
        renderRef.current.options.width = containerWidth;
        renderRef.current.options.height = containerHeight;
        renderRef.current.canvas.width = containerWidth;
        renderRef.current.canvas.height = containerHeight;
        Render.setPixelRatio(renderRef.current, window.devicePixelRatio);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div 
      ref={sceneRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 10,
        pointerEvents: 'none', // 不拦截默认页面交互
      }}
    />
  );
};

export default CrownSnowfall;
