# 2026-07-29 工作日志：Modbus 协议学习与 Input Register 读取实践

## 今日概览

用 Java + j2mod 库从零完成 Modbus TCP 读取 Input Register（功能码 0x04）的程序：安装 Witte Modbus Slave 工具作从站、搭建 Maven 工程并写主站程序、跑通端到端读取，期间排查了 JDK/Maven 环境、IDEA 模块依赖、功能码不匹配等问题。最终程序能正确读出从站寄存器值，并整理了学习笔记。

## 完成事项

- 安装 Witte Modbus Slave v9 工具，配置为 TCP 从站（端口 502、Slave ID 1、Function 04 Input Register、Address 0、Quantity 10）。
- 用 Java + j2mod 3.3.0 写了 Modbus 主站程序 `ModbusInputRegisterReader`，调用 `readInputRegisters` 读取 10 个输入寄存器；另写了 `ModbusExplorer` 用于对比四个功能码。
- 端到端验证：先以 Java 版从站 + 主站自测，读到 100~1000；再以 GUI 工具作从站，读到手动填入的值（12/0/13…）。
- 整理了 `README.md`（操作手册）和 `Modbus学习笔记.md`（含协议讲解、接到真实项目的流程、速查表）。
- 配置 Windows Terminal 铃声通知（`bellStyle: all`）+ Claude Code `terminal_bell` 通知，实现任务完成后任务栏闪烁提醒。
- 安装 `write-work-log` skill 到用户级 `~/.claude/skills/`。

## 问题与解决

### IDEA 报"程序包 com.ghgande.j2mod 不存在 / 无法解析符号"

- **现象**：Maven `package` 能成功，但 IDEA 里编译/运行报 j2mod 包不存在，红色波浪线不消。
- **分析**：打开的是外层项目目录，而 `pom.xml` 在子文件夹。IDEA 没把子文件夹作为 Maven 工程导入，而是建了一个"普通 Java 模块"抢占源码目录，该模块没挂任何 Maven 依赖；Maven 导入用的是外部存储（workspace model），依赖没连到编辑器实际编译的模块。查 IDEA 日志确认导入本身成功、j2mod 也被索引，根因是两个模块抢源码。
- **处理**：关闭 IDEA，删除两份冲突的 `.idea` 配置，重新只打开含 `pom.xml` 的子文件夹 `modbus-client`，让它作为单一 Maven 模块导入。
- **验证**：重新打开后 `External Libraries` 出现 j2mod、源码目录变蓝、红色波浪线消失，程序可编译运行。

### 编译报"无法编译为 JVM 目标 25，回退 SDK 版本 8 不支持"

- **现象**：IDEA 编译报目标 25 与 SDK 8 不匹配。
- **分析**：项目 SDK 曾设为高版本 JDK，语言级别被默认得很高，但实际 SDK 回退成了 Java 8；`pom.xml` 声明的是 1.8。
- **处理**：在 `Project Structure` 把 Project SDK、模块语言级别、`Java Compiler` 字节码目标统一设为 8。
- **验证**：编译通过。

### 运行报 Connection refused

- **现象**：程序运行报 `Connection refused: getsockopt`。
- **分析**：502 端口没有从站监听。
- **处理**：先启动从站（Java 版 `ModbusTestSlave` 或 GUI 工具 F3 连接 TCP 502）。
- **验证**：从站启动后再运行读取程序，连接成功。

### 运行报 Illegal Function

- **现象**：连接成功但读取出错 `Illegal Function`（Modbus 异常码 01）。
- **分析**：GUI 工具窗口配置的功能码不是 04，主站发 FC04 请求，从站不认该功能码。
- **处理**：GUI 工具 F8 把 Function 设为 `04 Input Register (3x)`。
- **验证**：再次运行，成功读到寄存器值。

### 打包出的 jar 无法 java -jar 运行

- **现象**：`java -jar` 报 `no main manifest attribute`。
- **分析**：`pom.xml` 曾移除了 shade 插件，`package` 产出的是不含 Main-Class、不含依赖的"薄 jar"。
- **处理**：在 `pom.xml` 加回 `maven-shade-plugin`，打包产出含依赖与 Main-Class 的 fat jar。
- **验证**：用 `jar` 命令确认 Main-Class 与 j2mod 类均已打入，`java -jar` 可正常启动并读取。

## 技术记录

Modbus TCP 读取 Input Register 核心代码：

```java
ModbusTCPMaster master = new ModbusTCPMaster("127.0.0.1", 502, 3000, true);
master.connect();
InputRegister[] regs = master.readInputRegisters(1, 0, 10);  // (SlaveID, 起始偏移, 数量) -> FC04
for (InputRegister r : regs) {
    System.out.println(r.getValue());   // 16位无符号 0~65535
}
master.disconnect();
```

Modbus 关键概念：

- 四个读功能码：01 线圈、02 离散输入、03 保持寄存器、04 输入寄存器（位 vs 寄存器、只读 vs 读写）。
- 地址：协议传 0 起始偏移量，文档/工具用 1 起始寄存器号（30001 -> 偏移 0）。
- 异常码：01 Illegal Function（功能码不匹配）、02 Illegal Data Address、03 Illegal Data Value。

GUI 从站配置：F3 连接选 TCP/IP、端口 502；F8 设 Slave ID / Function / Address / Quantity；F12 看报文字节。

RTU 与 TCP：协议核心一致，传输层不同；j2mod 把 `ModbusTCPMaster` 换成 `ModbusSerialMaster` + `SerialParameters`，`readInputRegisters` 调用不变。

Windows Terminal 通知：在 settings.json 的 `profiles.defaults` 设 `"bellStyle": "all"`，配合 Claude Code 通知设置 `terminal_bell`，任务完成时任务栏闪烁 + 响铃。

## 待沉淀知识

- Modbus 协议完整体系（报文 MBAP/PDU 结构、RTU 的 CRC16 与帧分隔）--已在学习笔记整理，可继续深化。
- j2mod 库的 Master/Slave API 与内部实现。
- IDEA 的 Maven workspace model / 外部存储机制（为何打开外层目录会导致模块冲突）。

## 后续计划

- 接到真实 Modbus 项目后，按"读设备寄存器表 -> 工具单点调试 -> Java 代码适配（RTU）-> 排坑 -> 工程化"流程落地。
- 准备 USB-RS485 转换器或虚拟串口（如 com0com）以本机测试 RTU。
- 真实设备到手后验证 float32 字节序、多设备轮询、断线重连等工程化问题。

## 今日总结

从零跑通了 Modbus TCP 读取 Input Register 的 Java 程序，过程中把环境搭建、IDEA Maven 导入、Modbus 协议、功能码与地址关系都趟了一遍。最耗时的不是写代码而是 IDEA 模块依赖问题，根因是打开目录层级不对导致 Maven 模块冲突，最终靠查 IDEA 日志定位。主要收获：掌握了 Modbus 协议核心与 function/address 关系，并整理出可直接用于真实项目的学习笔记和速查表。可改进处：环境类问题应更早查日志定位，而非反复试 UI 选项。
