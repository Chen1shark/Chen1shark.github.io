# 学习笔记发布规则

## 用途

本文件只用于约束 AI 整理和发布学习笔记，不作为博客文章展示。

当用户把一篇原始笔记和本文件交给 AI 时，AI 应按照以下规则修改笔记，使其符合当前博客的文件、元数据和 Markdown 格式。除非用户另外说明，文章分类固定为 `学习笔记`。

## AI 的执行原则

1. 保留原笔记的技术含义、结论、代码和重要细节，不得擅自删减知识点或编造内容。
2. 可以修正错别字、标点、空行、标题层级、列表、表格和代码块格式。
3. 可以调整段落顺序，使笔记结构更清晰，但不能改变原作者的结论。
4. 原笔记缺少标题、摘要、标签或日期时，可以根据现有内容合理补全。
5. 无法确定的技术事实应保留原文并提醒用户确认，不要自行猜测。
6. 在博客项目中执行任务时，应直接修改对应文件并同步文章索引，不要只给出一份无法发布的示例文本。

## 发布后必须具备的文件

每篇笔记必须拥有独立目录：

```text
public/blogs/
└── note-slug/
    ├── config.json
    ├── index.md
    └── images/          # 可选
```

要求如下：

- `note-slug` 是文章唯一标识，同时用于文章网址。
- slug 只能包含小写英文字母、数字和短横线。
- slug 不得包含空格、中文、下划线或其他特殊字符。
- `config.json` 保存文章元数据。
- `index.md` 保存整理后的完整正文。
- 只有文章确实使用本地图片时才创建 `images` 目录。

合格的 slug 示例：

```text
java-stream-note
python-agent-basic
spring-boot-security
```

## config.json 规则

每篇笔记的 `config.json` 使用以下结构：

```json
{
  "title": "Java Stream 学习笔记",
  "tags": ["Java", "Stream", "函数式编程"],
  "date": "2026-07-19T09:00",
  "summary": "整理 Java Stream 的创建、转换、过滤与收集操作。",
  "hidden": false,
  "category": "学习笔记"
}
```

字段要求：

| 字段 | 是否必需 | 格式 |
| --- | --- | --- |
| `title` | 是 | 与文章标题一致的字符串 |
| `tags` | 是 | 包含 2～5 个标签的字符串数组 |
| `date` | 是 | `YYYY-MM-DDTHH:mm` |
| `summary` | 是 | 能概括笔记主题的一段纯文本 |
| `hidden` | 是 | 正常发布时固定为 `false` |
| `category` | 是 | 固定为 `学习笔记` |
| `cover` | 否 | 本地封面使用 `/blogs/slug/文件名` |

额外要求：

- 不使用封面时直接省略 `cover`，不要写空字符串。
- 标签中不要携带 `#`，页面会自动添加。
- 标签只表达技术或知识主题，不要重复填写 `学习笔记`。
- 同一个标签的大小写和空格必须统一，例如始终使用 `Java`，不要混用 `java`。
- JSON 使用双引号，不写注释，最后一个字段后不能有逗号。

## index.md 规则

整理后的正文必须保存为 UTF-8 编码的 `index.md`。

推荐结构：

````markdown
# Java Stream 学习笔记

用一段简短文字说明本篇笔记的主题和范围。

## 基本概念

正文内容。

## 常用操作

### 过滤数据

正文内容。

```java
List<String> result = names.stream()
    .filter(name -> name.startsWith("A"))
    .toList();
```

## 总结

正文内容。
````

### 标题格式

- 全文只保留一个一级标题 `#`。
- 一级标题应与 `config.json` 中的 `title` 一致。
- 主要章节使用 `##`，章节内的小节使用 `###`。
- 标题层级不得跳级，例如不能从 `##` 直接跳到 `####`。
- 不同章节尽量不要使用完全相同的标题，避免目录锚点重复。
- 标题末尾通常不加句号。

### 段落与列表格式

- 不同段落之间保留一个空行。
- 并列内容使用 Markdown 无序列表或有序列表，不要手工输入连续的特殊符号。
- 操作步骤需要强调顺序时使用有序列表。
- 对比数据适合使用 Markdown 表格。
- 文件名、类名、方法名、命令和短代码使用行内代码标记，例如 `ArrayList`。

### 代码块格式

- 多行代码必须使用围栏代码块。
- 代码块必须标注语言，以便博客进行语法高亮。
- 不要改变原代码的业务含义。
- 可以统一缩进和清除无意义的多余空行。

示例：

````markdown
```java
System.out.println("Hello");
```
````

常用语言标识包括：

```text
java
python
javascript
typescript
sql
json
yaml
bash
text
```

### 图片格式

本地图片应放在当前文章目录内，例如：

```text
public/blogs/java-stream-note/images/stream-flow.webp
```

正文使用网站根目录绝对路径：

```markdown
![Stream 执行流程](/blogs/java-stream-note/images/stream-flow.webp)
```

不得使用可能在文章详情页解析错误的相对路径：

```markdown
![错误示例](./images/stream-flow.webp)
```

图片还必须满足：

- 替代文字能够说明图片含义，不能只写“图片”。
- 优先使用经过压缩的 WebP 或 PNG。
- 文件名只使用小写英文、数字和短横线。

## 文章索引规则

AI 完成文章目录后，必须同步修改：

```text
public/blogs/index.json
```

新增索引项的结构如下：

```json
{
  "slug": "java-stream-note",
  "title": "Java Stream 学习笔记",
  "tags": ["Java", "Stream", "函数式编程"],
  "date": "2026-07-19T09:00",
  "summary": "整理 Java Stream 的创建、转换、过滤与收集操作。",
  "hidden": false,
  "category": "学习笔记"
}
```

索引要求：

- `slug` 必须与文章目录名完全一致。
- 其余字段必须与文章的 `config.json` 保持一致。
- 不要创建重复 slug。
- 文章按照 `date` 从新到旧排列，最新文章放在数组前面。
- 修改后必须确认整个 `index.json` 仍是合法 JSON。
- 不要修改 `public/blogs/categories.json`，除非用户明确要求新增分类。

## AI 完成任务前的检查清单

AI 在交付修改结果前必须逐项检查：

- [ ] 没有改变原笔记的技术含义和结论。
- [ ] 文章目录名符合 slug 规则。
- [ ] 目录内存在合法的 `config.json` 和 `index.md`。
- [ ] `category` 固定为 `学习笔记`。
- [ ] `hidden` 固定为 `false`。
- [ ] 日期格式为 `YYYY-MM-DDTHH:mm`。
- [ ] 标签不带 `#`，没有重复分类名称，大小写统一。
- [ ] 正文只有一个一级标题，标题层级没有跳级。
- [ ] 代码块均标注了正确语言。
- [ ] 本地图片均使用 `/blogs/slug/...` 绝对路径。
- [ ] `public/blogs/index.json` 已同步，且字段与 config 一致。
- [ ] 没有重复 slug，也没有破坏其他文章的索引记录。
- [ ] JSON、Markdown 和 TypeScript 检查均无错误。
- [ ] 已执行 `pnpm build`，或明确说明未能执行的原因。

## AI 的交付格式

完成后，AI 应简洁说明：

1. 笔记最终标题和 slug。
2. 创建或修改了哪些文件。
3. 自动补充或规范了哪些元数据。
4. 是否同步了文章索引。
5. 执行了哪些验证，以及验证是否通过。

不要在最终回复中重复整篇笔记，除非用户明确要求查看全文。
