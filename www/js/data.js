// Java 后端词汇卡片数据
// 字段：term 术语/名称, category 分类, def 解释, code 代码示例
// literal 字面/本义（帮助理解命名由来）, phonetic 音标（可选）
window.JAVA_TERMS = [
  // ================= 命名与缩写 =================
  { term: "JVM", category: "命名与缩写", literal: "Java Virtual Machine", def: "Java 虚拟机，负责加载并执行字节码，是 Java 跨平台的核心。", code: "java HelloWorld.class  // JVM 加载并执行 .class 字节码" },
  { term: "JRE", category: "命名与缩写", literal: "Java Runtime Environment", def: "Java 运行时环境，包含 JVM + 核心类库，只能运行程序，不能编译。", code: "JRE = JVM + 核心类库" },
  { term: "JDK", category: "命名与缩写", literal: "Java Development Kit", def: "Java 开发工具包，包含 JRE + 编译器 javac 等开发工具。", code: "javac Hello.java   // 编译成字节码\njava Hello          // 运行" },
  { term: "OOP", category: "命名与缩写", literal: "Object-Oriented Programming", def: "面向对象编程，以对象组织代码，三大特性：封装、继承、多态。", code: "class Dog extends Animal { ... }" },
  { term: "IoC", category: "命名与缩写", literal: "Inversion of Control", def: "控制反转，对象创建与依赖关系交给容器管理，而不是自己 new，Spring 的核心思想。", code: "@Autowired\nprivate UserService userService;" },
  { term: "AOP", category: "命名与缩写", literal: "Aspect-Oriented Programming", def: "面向切面编程，把日志、事务等横切逻辑从业务代码中抽离。", code: "@Around(\"execution(* com.demo.*.*(..))\")" },
  { term: "POJO", category: "命名与缩写", literal: "Plain Old Java Object", def: "普通 Java 对象，不继承特殊类、不实现特殊接口的简单对象。", code: "public class User {\n  private String name;\n  public String getName() { return name; }\n}" },
  { term: "DTO", category: "命名与缩写", literal: "Data Transfer Object", def: "数据传输对象，用于层与层之间、服务之间传递数据，通常不含业务逻辑。", code: "public class UserDTO { private String name; private Integer age; }" },
  { term: "VO", category: "命名与缩写", literal: "View Object / Value Object", def: "视图对象，返回给前端展示用的对象，字段按页面需求设计。", code: "public class UserVO { private String nickname; private String avatar; }" },
  { term: "DAO", category: "命名与缩写", literal: "Data Access Object", def: "数据访问对象，专门封装对数据库的增删改查操作。", code: "public interface UserDao {\n  User selectById(Long id);\n}" },
  { term: "API", category: "命名与缩写", literal: "Application Programming Interface", def: "应用程序编程接口，对外提供的可调用功能/接口集合。", code: "GET /api/users/1   // 一个 REST API" },
  { term: "RPC", category: "命名与缩写", literal: "Remote Procedure Call", def: "远程过程调用，像调本地方法一样调用另一台机器上的服务。", code: "userService.getUser(1L); // 实际调用远端服务" },
  { term: "ORM", category: "命名与缩写", literal: "Object-Relational Mapping", def: "对象关系映射，把数据库表和 Java 对象自动对应起来。", code: "User user = userMapper.selectById(1L);" },
  { term: "驼峰命名 camelCase", category: "命名与缩写", def: "首单词小写，后续单词首字母大写，用于变量名和方法名。", code: "String userName = \"tom\";\nint maxRetryCount = 3;" },
  { term: "帕斯卡命名 PascalCase", category: "命名与缩写", def: "每个单词首字母大写，用于类名和接口名。", code: "public class UserService { ... }" },

  // ================= 集合框架 =================
  { term: "ArrayList", category: "集合框架", literal: "数组列表", def: "基于数组的动态列表，查询快 O(1)，中间增删慢（需移动元素）。", code: "List<String> list = new ArrayList<>();\nlist.add(\"a\");\nlist.get(0);" },
  { term: "LinkedList", category: "集合框架", literal: "链表", def: "基于双向链表，头尾增删快 O(1)，随机查询慢 O(n)，同时实现 List 和 Deque。", code: "LinkedList<Integer> q = new LinkedList<>();\nq.addLast(1);\nq.removeFirst();" },
  { term: "HashMap", category: "集合框架", literal: "哈希映射", def: "基于哈希表的键值对，key 无序不重复，put/get 平均 O(1)，JDK8 链表过长转红黑树。", code: "Map<String, Integer> m = new HashMap<>();\nm.put(\"a\", 1);\nm.get(\"a\");" },
  { term: "ConcurrentHashMap", category: "集合框架", literal: "并发哈希映射", def: "线程安全的 HashMap，JDK8 用 CAS + synchronized 锁桶，读无锁，并发性能高。", code: "Map<String, String> m = new ConcurrentHashMap<>();" },
  { term: "TreeMap", category: "集合框架", literal: "树映射", def: "基于红黑树的键值对，key 按顺序排列，增删改查 O(log n)。", code: "Map<String, Integer> m = new TreeMap<>();" },
  { term: "HashSet", category: "集合框架", literal: "哈希集合", def: "基于 HashMap 的集合，元素无序且不可重复。", code: "Set<String> s = new HashSet<>();\ns.add(\"a\");" },
  { term: "Stack / Deque", category: "集合框架", literal: "栈 / 双端队列", phonetic: "/dek/", def: "栈（后进先出）。Deque 是 double-ended queue（双端队列），推荐用 ArrayDeque 实现栈。", code: "Deque<Integer> stack = new ArrayDeque<>();\nstack.push(1);\nstack.pop();" },
  { term: "泛型 Generics", category: "集合框架", phonetic: "/dʒəˈnerɪks/", def: "编译期类型约束，集合只装指定类型，避免强转和运行期类型错误。", code: "List<String> list = new ArrayList<>();" },

  // ================= 并发与多线程 =================
  { term: "synchronized", category: "并发与多线程", literal: "同步的", phonetic: "/ˈsɪŋkrənaɪzd/", def: "加锁关键字，保证同一时刻只有一个线程执行该方法/代码块。", code: "public synchronized void add() { count++; }" },
  { term: "volatile", category: "并发与多线程", literal: "易变的、不稳定的", phonetic: "/ˈvɒlətaɪl/", def: "保证变量可见性并禁止指令重排序，但不保证原子性，适合状态标志位。", code: "private volatile boolean running = true;" },
  { term: "ThreadLocal", category: "并发与多线程", literal: "线程本地变量", def: "每个线程持有独立变量副本，互不干扰，常用于保存用户上下文、数据库连接。", code: "ThreadLocal<User> ctx = new ThreadLocal<>();\nctx.set(user);\nctx.get();" },
  { term: "CAS", category: "并发与多线程", literal: "Compare And Swap", def: "比较并交换，乐观锁底层实现，先比较预期值再写入，由 CPU 原子指令支持。", code: "AtomicInteger ai = new AtomicInteger(0);\nai.incrementAndGet();" },
  { term: "线程池 ThreadPool", category: "并发与多线程", literal: "线程池", def: "复用线程执行任务，避免频繁创建销毁线程的开销。", code: "ExecutorService pool = Executors.newFixedThreadPool(10);\npool.submit(() -> doWork());" },
  { term: "AQS", category: "并发与多线程", literal: "AbstractQueuedSynchronizer", def: "抽象队列同步器，JUC 锁的底层框架，基于 volatile state + 双向队列。", code: "ReentrantLock lock = new ReentrantLock();\nlock.lock();\ntry { ... } finally { lock.unlock(); }" },
  { term: "ReentrantLock", category: "并发与多线程", literal: "可重入锁", def: "可重入锁，支持公平锁、可中断、tryLock 超时，比 synchronized 更灵活。", code: "lock.lock();\ntry { /* 临界区 */ } finally { lock.unlock(); }" },
  { term: "ReadWriteLock", category: "并发与多线程", literal: "读写锁", def: "读写锁，读读共享、读写互斥，适合读多写少的场景。", code: "ReentrantReadWriteLock rw = new ReentrantReadWriteLock();\nrw.readLock().lock();" },
  { term: "CountDownLatch", category: "并发与多线程", literal: "倒计数门闩", phonetic: "/lætʃ/", def: "倒计数门闩，等待 N 个线程都完成后才继续，一次性使用。", code: "CountDownLatch latch = new CountDownLatch(3);\nlatch.countDown();\nlatch.await();" },
  { term: "CyclicBarrier", category: "并发与多线程", literal: "循环屏障", phonetic: "/ˈbæriə/", def: "循环屏障，一组线程互相等待，都到齐后一起继续，可复用。", code: "CyclicBarrier b = new CyclicBarrier(3, () -> {});\nb.await();" },
  { term: "Semaphore", category: "并发与多线程", literal: "信号量", phonetic: "/ˈseməfɔːr/", def: "信号量，控制同时访问某个资源的线程数量，用于限流。", code: "Semaphore s = new Semaphore(5);\ns.acquire();\ns.release();" },
  { term: "CompletableFuture", category: "并发与多线程", literal: "可完成的未来任务", phonetic: "/ˈfjuːtʃə/", def: "异步编程工具，支持链式回调、组合、异常处理，替代阻塞等待。", code: "CompletableFuture.supplyAsync(this::doA)\n  .thenApply(this::doB)\n  .thenAccept(System.out::println);" },
  { term: "Callable / Future", category: "并发与多线程", literal: "可调用的 / 未来结果", phonetic: "/ˈkɔːləbl/", def: "Callable 是有返回值的任务，Future 用于获取异步结果（get 会阻塞）。", code: "Future<Integer> f = pool.submit(() -> 1 + 1);\nf.get();" },
  { term: "wait / notify", category: "并发与多线程", literal: "等待 / 通知", def: "Object 的方法，用于线程间等待与唤醒，必须在 synchronized 中调用。", code: "synchronized (lock) {\n  while (count == 0) lock.wait();\n  lock.notifyAll();\n}" },
  { term: "死锁 Deadlock", category: "并发与多线程", literal: "死锁", phonetic: "/ˈdedlɒk/", def: "多个线程互相持有对方需要的锁而永久阻塞，四个条件：互斥、占有且等待、不可剥夺、循环等待。", code: "// 线程A锁1再锁2，线程B锁2再锁1 -> 死锁" },
  { term: "乐观锁 vs 悲观锁", category: "并发与多线程", literal: "optimistic / pessimistic", phonetic: "/ˌɒptɪˈmɪstɪk/ /ˌpesɪˈmɪstɪk/", def: "悲观锁先加锁再操作（synchronized）；乐观锁先操作再校验版本（CAS/version 字段）。", code: "UPDATE t SET v = v + 1 WHERE id = ? AND version = ?" },

  // ================= JVM 与内存 =================
  { term: "堆 Heap", category: "JVM 与内存", literal: "堆", phonetic: "/hiːp/", def: "所有线程共享的内存区，存放对象实例和数组，是 GC 主要区域。", code: "User u = new User(); // 引用在栈，对象在堆" },
  { term: "栈 Stack", category: "JVM 与内存", literal: "栈", phonetic: "/stæk/", def: "线程私有，存放局部变量和方法调用帧，方法结束自动释放。", code: "void m() { int x = 1; } // x 存在栈帧里" },
  { term: "方法区 Method Area", category: "JVM 与内存", literal: "方法区", def: "存放类信息、常量、静态变量，JDK8 后用元空间（本地内存）实现。", code: "static int count = 0; // 在方法区" },
  { term: "GC 垃圾回收", category: "JVM 与内存", literal: "Garbage Collection", def: "自动回收不再被引用的堆内存，分代回收：新生代 Minor GC、老年代 Major/Full GC。", code: "-Xms256m -Xmx512m  // 堆初始/最大内存" },
  { term: "OOM 内存溢出", category: "JVM 与内存", literal: "OutOfMemoryError", def: "内存溢出，堆内存不足，常见于对象过多、内存泄漏、堆设置过小。", code: "java.lang.OutOfMemoryError: Java heap space" },
  { term: "类加载 ClassLoader", category: "JVM 与内存", literal: "类加载器", def: "把 .class 字节码加载到 JVM 内存并生成 Class 对象的过程。", code: "Class<?> c = Class.forName(\"com.demo.User\");" },
  { term: "双亲委派", category: "JVM 与内存", def: "类加载时先向上委派给父加载器，父加载不了才自己加载，避免核心类被篡改。", code: "// AppClassLoader -> ExtClassLoader -> Bootstrap" },
  { term: "JIT 即时编译", category: "JVM 与内存", literal: "Just-In-Time", def: "把热点字节码编译成本地机器码，提升执行速度。", code: "// 热点代码被 JIT 编译为机器码直接执行" },
  { term: "强软弱虚引用", category: "JVM 与内存", literal: "strong / soft / weak / phantom", def: "强引用不回收；软引用内存不足时回收；弱引用下次 GC 回收；虚引用仅用于跟踪。", code: "SoftReference<byte[]> soft = new SoftReference<>(data);" },

  // ================= 面向对象 =================
  { term: "封装", category: "面向对象", literal: "Encapsulation", phonetic: "/ɪnˌkæpsjuˈleɪʃn/", def: "隐藏内部细节，只暴露必要的 getter/setter 接口。", code: "private String name;\npublic String getName() { return name; }" },
  { term: "继承", category: "面向对象", literal: "Inheritance", phonetic: "/ɪnˈherɪtəns/", def: "子类复用父类的属性和方法，Java 只支持单继承。", code: "class Dog extends Animal { }" },
  { term: "多态 Polymorphism", category: "面向对象", literal: "多态", phonetic: "/ˌpɒliˈmɔːfɪzəm/", def: "父类引用指向子类对象，同一方法表现出不同行为。", code: "Animal a = new Dog();\na.speak();" },
  { term: "重写 vs 重载", category: "面向对象", literal: "Override / Overload", phonetic: "/ˌəʊvəˈraɪd/", def: "重写是子类覆盖父类同签名方法；重载是同类方法名相同参数不同。", code: "int add(int a, int b)\ndouble add(double a, double b)" },
  { term: "接口 vs 抽象类", category: "面向对象", literal: "Interface / Abstract Class", def: "接口定义规范（可多实现）；抽象类含成员变量和构造器，单继承。", code: "class A extends B implements C, D { }" },

  // ================= 函数式编程 =================
  { term: "Lambda 表达式", category: "函数式编程", literal: "希腊字母 λ", phonetic: "/ˈlæmdə/", def: "匿名函数的简洁写法，用于函数式接口。", code: "list.forEach(x -> System.out.println(x));" },
  { term: "Stream API", category: "函数式编程", literal: "流", phonetic: "/striːm/", def: "对集合声明式流水线操作：filter、map、reduce，可串行/并行。", code: "list.stream().filter(x -> x > 0).map(String::valueOf).toList();" },
  { term: "Optional", category: "函数式编程", literal: "可选的", phonetic: "/ˈɒpʃənl/", def: "包装可能为 null 的值，强制显式处理空值，避免空指针。", code: "Optional<User> u = findUser();\nu.ifPresent(x -> print(x.getName()));" },
  { term: "函数式接口", category: "函数式编程", literal: "Functional Interface", def: "只有一个抽象方法的接口，可用 Lambda 实现。", code: "@FunctionalInterface\ninterface Runnable { void run(); }" },

  // ================= 注解与反射 =================
  { term: "@Override", category: "注解与反射", literal: "覆盖", phonetic: "/ˌəʊvəˈraɪd/", def: "标注重写父类方法，编译期检查签名，防止没重写成功。", code: "@Override\npublic String toString() { return \"...\"; }" },
  { term: "@FunctionalInterface", category: "注解与反射", literal: "函数式接口", def: "标注函数式接口（仅一个抽象方法），可用 Lambda。", code: "@FunctionalInterface\ninterface Runnable { void run(); }" },
  { term: "@Deprecated", category: "注解与反射", literal: "弃用的、过时的", phonetic: "/ˈdeprəkeɪtɪd/", def: "标记方法/类已过时，编译时给出警告。", code: "@Deprecated\npublic void oldMethod() { ... }" },
  { term: "反射 Reflection", category: "注解与反射", literal: "反射", phonetic: "/rɪˈflekʃn/", def: "运行时动态获取类的信息、创建对象、调用方法，框架（Spring）的基石。", code: "Class<?> c = Class.forName(\"com.demo.User\");\nc.getMethod(\"getName\").invoke(obj);" },

  // ================= Spring 核心 =================
  { term: "Spring IoC 容器", category: "Spring 核心", literal: "容器 Container", def: "负责创建、装配、管理 Bean 生命周期的容器，是 Spring 的核心。", code: "ApplicationContext ctx = new AnnotationConfigApplicationContext(AppConfig.class);" },
  { term: "DI 依赖注入", category: "Spring 核心", literal: "Dependency Injection", def: "依赖由容器自动注入，而不是自己 new，降低耦合。", code: "@Autowired\nprivate UserService userService;" },
  { term: "Bean", category: "Spring 核心", literal: "豆", phonetic: "/biːn/", def: "由 Spring 容器创建和管理的对象。Bean 本义是「豆」，借指可复用的组件。", code: "@Bean\npublic DataSource dataSource() { return new DataSource(); }" },
  { term: "Bean 生命周期", category: "Spring 核心", def: "实例化 -> 属性注入 -> 初始化 -> 使用 -> 销毁。", code: "@PostConstruct\npublic void init() { }\n@PreDestroy\npublic void destroy() { }" },
  { term: "Bean 作用域", category: "Spring 核心", literal: "作用域 Scope", phonetic: "/skəʊp/", def: "singleton 单例（默认）、prototype 多例、request、session。", code: "@Scope(\"prototype\")\n@Component\nclass Task { }" },
  { term: "循环依赖", category: "Spring 核心", def: "A 依赖 B、B 依赖 A，Spring 用三级缓存提前暴露半成品对象解决单例循环依赖。", code: "class A { @Autowired B b; }\nclass B { @Autowired A a; }" },
  { term: "动态代理", category: "Spring 核心", literal: "代理 Proxy", phonetic: "/ˈprɒksi/", def: "AOP 的实现方式：JDK 动态代理（接口）和 CGLIB（类）。", code: "Proxy.newProxyInstance(loader, interfaces, handler);" },
  { term: "ApplicationContext vs BeanFactory", category: "Spring 核心", literal: "上下文 Context", phonetic: "/ˈkɒntekst/", def: "ApplicationContext 是更高级的容器，在 BeanFactory 基础上增加事件、国际化、AOP 等。", code: "// BeanFactory 是底层接口，ApplicationContext 是常用实现" },

  // ================= Spring 注解 =================
  { term: "@Component", category: "Spring 注解", literal: "组件", def: "把类交给 Spring 管理，是 @Service/@Repository/@Controller 的通用注解。", code: "@Component\npublic class Util { }" },
  { term: "@Autowired", category: "Spring 注解", literal: "自动装配", def: "自动装配依赖，默认按类型注入，配合 @Qualifier 按名称。", code: "@Autowired\nprivate UserService userService;" },
  { term: "@Service", category: "Spring 注解", literal: "服务", def: "标注业务层组件，语义上比 @Component 更清晰。", code: "@Service\npublic class UserServiceImpl implements UserService { }" },
  { term: "@Repository", category: "Spring 注解", literal: "仓库", phonetic: "/rɪˈpɒzətri/", def: "标注数据访问层组件，会把异常翻译为 Spring 数据访问异常。", code: "@Repository\npublic class UserDao { }" },
  { term: "@Controller / @RestController", category: "Spring 注解", literal: "控制器", def: "@Controller 处理 Web 请求；@RestController = @Controller + @ResponseBody，直接返回 JSON。", code: "@RestController\n@RequestMapping(\"/api/user\")\npublic class UserController { }" },
  { term: "@Configuration / @Bean", category: "Spring 注解", literal: "配置", def: "@Configuration 声明配置类，@Bean 声明由容器管理的对象。", code: "@Configuration\npublic class AppConfig {\n  @Bean public DataSource ds() { return new DataSource(); }\n}" },
  { term: "@Value", category: "Spring 注解", literal: "值", def: "从配置文件注入值。", code: "@Value(\"${server.port}\")\nprivate int port;" },
  { term: "@Transactional", category: "Spring 注解", literal: "事务的", phonetic: "/trænˈzækʃənl/", def: "声明式事务，方法异常时自动回滚。", code: "@Transactional(rollbackFor = Exception.class)\npublic void save(User u) { ... }" },
  { term: "@RequestMapping", category: "Spring 注解", literal: "请求映射", def: "映射请求路径和方法，衍生 @GetMapping/@PostMapping 等。", code: "@GetMapping(\"/{id}\")\npublic User get(@PathVariable Long id) { ... }" },

  // ================= Spring Boot =================
  { term: "自动配置 AutoConfiguration", category: "Spring Boot", def: "根据依赖自动装配 Bean，减少手工配置。", code: "@EnableAutoConfiguration // 自动配置的开关" },
  { term: "starter", category: "Spring Boot", literal: "启动器", def: "一组依赖的打包，如 spring-boot-starter-web 一次性引入 Web 相关依赖。", code: "implementation 'org.springframework.boot:spring-boot-starter-web'" },
  { term: "约定优于配置", category: "Spring Boot", def: "提供合理默认配置，开发者只需改少量配置即可运行。", code: "// 零 XML 配置即可启动 Web 应用" },
  { term: "@SpringBootApplication", category: "Spring Boot", def: "组合注解 = @Configuration + @EnableAutoConfiguration + @ComponentScan。", code: "@SpringBootApplication\npublic class App { public static void main(String[] a) { SpringApplication.run(App.class, a); } }" },
  { term: "内嵌容器", category: "Spring Boot", def: "内嵌 Tomcat/Jetty，打成 jar 直接运行，无需外部部署。", code: "java -jar app.jar" },
  { term: "application.yml", category: "Spring Boot", def: "配置文件，配置端口、数据源、自定义属性等。", code: "server:\n  port: 8080\nspring:\n  datasource:\n    url: jdbc:mysql://..." },

  // ================= Spring MVC =================
  { term: "DispatcherServlet", category: "Spring MVC", literal: "分发调度器", phonetic: "/dɪˈspætʃə/", def: "前端控制器，统一接收请求并分发到对应 Handler。", code: "// 所有请求先经过 DispatcherServlet" },
  { term: "拦截器 Interceptor", category: "Spring MVC", literal: "拦截器", phonetic: "/ˌɪntəˈseptə/", def: "在请求处理前后执行，用于登录校验、日志、权限。", code: "public boolean preHandle(req, resp, handler) { ... }" },
  { term: "参数绑定", category: "Spring MVC", literal: "绑定 Binding", def: "自动把请求参数绑定到方法参数，支持 @RequestParam、@RequestBody、@PathVariable。", code: "@PostMapping(\"/save\")\npublic void save(@RequestBody User user) { }" },
  { term: "全局异常处理", category: "Spring MVC", def: "用 @ControllerAdvice + @ExceptionHandler 统一捕获并返回异常。", code: "@ControllerAdvice\npublic class GlobalExceptionHandler {\n  @ExceptionHandler(Exception.class)\n  public Result handle(Exception e) { ... }\n}" },
  { term: "RESTful", category: "Spring MVC", literal: "Representational State Transfer", def: "用 URL 表示资源，用 HTTP 方法表示操作：GET 查、POST 增、PUT 改、DELETE 删。", code: "GET /users/1   POST /users   DELETE /users/1" },

  // ================= 数据库与 SQL =================
  { term: "索引 Index", category: "数据库与 SQL", literal: "索引", phonetic: "/ˈɪndeks/", def: "加速查询的数据结构（B+ 树），但会降低写入速度、占用空间。", code: "CREATE INDEX idx_name ON users(name);" },
  { term: "B+ 树", category: "数据库与 SQL", def: "MySQL InnoDB 索引的底层结构，非叶子存索引、叶子存数据且有序链表连接。", code: "// 高度低、范围查询高效" },
  { term: "聚集索引 vs 二级索引", category: "数据库与 SQL", def: "聚集索引叶子存整行数据（主键）；二级索引叶子存主键值，需回表。", code: "PRIMARY KEY(id)  -- 聚集索引" },
  { term: "回表", category: "数据库与 SQL", def: "二级索引命中后，还需根据主键回到聚集索引查完整行数据。", code: "// 覆盖索引可避免回表" },
  { term: "覆盖索引", category: "数据库与 SQL", def: "查询的列都在索引里，直接返回结果，无需回表。", code: "SELECT name FROM users WHERE name = 'tom'; -- name 有索引" },
  { term: "ACID", category: "数据库与 SQL", literal: "Atomicity Consistency Isolation Durability", def: "事务四大特性：原子性、一致性、隔离性、持久性。", code: "Atomicity / Consistency / Isolation / Durability" },
  { term: "事务隔离级别", category: "数据库与 SQL", literal: "隔离 Isolation", phonetic: "/ˌaɪsəˈleɪʃn/", def: "读未提交、读已提交、可重复读、串行化，越往后隔离越强、性能越低。", code: "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;" },
  { term: "MVCC", category: "数据库与 SQL", literal: "Multi-Version Concurrency Control", def: "多版本并发控制，通过 undo log + 版本号实现快照读，避免加锁读。", code: "// InnoDB 的可重复读靠 MVCC 实现" },
  { term: "慢查询优化", category: "数据库与 SQL", def: "用 EXPLAIN 分析执行计划，关注 type、key、rows，避免全表扫描。", code: "EXPLAIN SELECT * FROM users WHERE name = 'tom';" },
  { term: "分库分表", category: "数据库与 SQL", def: "数据量过大时，按规则拆分到多个库/表（水平分表、垂直拆分）。", code: "// user_0, user_1 ... 按 id 取模路由" },
  { term: "连接池", category: "数据库与 SQL", def: "复用数据库连接，避免每次新建连接的开销（如 HikariCP）。", code: "spring.datasource.hikari.maximum-pool-size=20" },

  // ================= 持久层框架 =================
  { term: "MyBatis", category: "持久层框架", def: "半自动 ORM，手写 SQL 与对象映射，灵活可控。", code: "@Select(\"SELECT * FROM users WHERE id = #{id}\")\nUser selectById(Long id);" },
  { term: "JPA / Hibernate", category: "持久层框架", def: "全自动 ORM，操作对象即操作数据库，无需手写 SQL。", code: "userRepository.findById(1L);" },
  { term: "#{} 与 ${}", category: "持久层框架", def: "#{} 预编译防 SQL 注入；${} 字符串拼接有注入风险，仅用于表名等。", code: "SELECT * FROM users WHERE id = #{id}  // 安全" },
  { term: "一级/二级缓存", category: "持久层框架", literal: "缓存 Cache", phonetic: "/kæʃ/", def: "MyBatis 一级缓存是 SqlSession 级别，二级是 Mapper 全局。", code: "// 一级缓存默认开启，二级需配置" },

  // ================= 缓存与 Redis =================
  { term: "Redis", category: "缓存与 Redis", def: "基于内存的键值数据库，支持多种数据结构，常用于缓存、分布式锁。", code: "SET key value   GET key   EXPIRE key 60" },
  { term: "缓存穿透", category: "缓存与 Redis", literal: "穿透 Penetration", phonetic: "/ˌpenɪˈtreɪʃn/", def: "查询不存在的 key，缓存和数据库都没有，大量请求打穿缓存直击 DB。", code: "// 解决：缓存空值 或 布隆过滤器" },
  { term: "缓存击穿", category: "缓存与 Redis", literal: "击穿 Breakdown", def: "某个热点 key 过期瞬间，大量并发请求同时打到数据库。", code: "// 解决：热点 key 不过期 或 加互斥锁" },
  { term: "缓存雪崩", category: "缓存与 Redis", literal: "雪崩 Avalanche", phonetic: "/ˈævəlɑːnʃ/", def: "大量 key 同一时间过期或 Redis 宕机，请求全部压到数据库。", code: "// 解决：过期时间加随机值、集群高可用" },
  { term: "缓存一致性", category: "缓存与 Redis", literal: "一致性 Consistency", phonetic: "/kənˈsɪstənsi/", def: "缓存和数据库数据保持一致，常见方案：Cache Aside（先更新 DB 再删缓存）。", code: "// 更新 DB 后删除缓存，而不是更新缓存" },
  { term: "Redis 持久化", category: "缓存与 Redis", literal: "持久化 Persistence", phonetic: "/pəˈsɪstəns/", def: "RDB 快照 + AOF 追加日志，重启后恢复数据。", code: "save 900 1   appendonly yes" },
  { term: "Redis 哨兵/集群", category: "缓存与 Redis", literal: "哨兵 Sentinel", phonetic: "/ˈsentɪnl/", def: "哨兵做高可用主从切换，集群做数据分片和水平扩展。", code: "redis-cli --cluster create ..." },

  // ================= 消息队列 =================
  { term: "消息队列 MQ", category: "消息队列", literal: "Message Queue", def: "异步通信的中间件，解耦、削峰、异步，如 Kafka、RabbitMQ、RocketMQ。", code: "producer.send(topic, message);" },
  { term: "生产者消费者", category: "消息队列", literal: "Producer / Consumer", phonetic: "/prəˈdjuːsə/ /kənˈsjuːmə/", def: "生产者发消息到队列，消费者从队列消费，两者解耦。", code: "// Producer -> Broker -> Consumer" },
  { term: "幂等性", category: "消息队列", literal: "幂等 Idempotent", phonetic: "/ˌaɪdemˈpəʊtənt/", def: "同一操作执行多次结果不变，防止重复消费导致数据错误。", code: "// 消费前查唯一 ID 是否已处理" },
  { term: "消息丢失", category: "消息队列", def: "生产、传输、消费三个阶段都可能丢消息，需分别做确认/持久化/手动 ACK。", code: "// 生产确认 + broker 持久化 + 消费手动 ack" },
  { term: "顺序消息", category: "消息队列", def: "保证同一业务的消息按顺序消费，如按 key 路由到同一分区。", code: "// 同一订单的消息发到同一 queue/partition" },
  { term: "Kafka", category: "消息队列", def: "高吞吐分布式消息系统，基于分区 + 日志存储，适合大数据流。", code: "// topic -> partition -> offset" },
  { term: "RabbitMQ", category: "消息队列", def: "基于 AMQP 协议，支持多种交换机路由，功能灵活。", code: "// exchange -> routing key -> queue" },
  { term: "死信队列", category: "消息队列", literal: "死信 Dead Letter", def: "消息消费失败重试多次仍失败后进入死信队列，用于人工处理。", code: "// DLQ: Dead Letter Queue" },

  // ================= 分布式 =================
  { term: "CAP 定理", category: "分布式", literal: "Consistency Availability Partition tolerance", def: "一致性、可用性、分区容错性三者不可兼得，分布式系统必须在 C 和 A 之间取舍。", code: "// CP（ZooKeeper）或 AP（Eureka）" },
  { term: "BASE 理论", category: "分布式", literal: "Basically Available Soft state Eventually consistent", def: "基本可用、软状态、最终一致，是对 CAP 中 AP 的延伸。", code: "// 允许短暂不一致，最终达到一致" },
  { term: "一致性哈希", category: "分布式", literal: "Consistent Hashing", def: "把数据按哈希映射到环上，节点增减只影响部分数据，减少迁移。", code: "// hash(key) -> 顺时针找最近的节点" },
  { term: "分布式锁", category: "分布式", literal: "Distributed Lock", def: "多个服务实例间保证同一时刻只有一个能执行，常用 Redis/Redisson 实现。", code: "RLock lock = redisson.getLock(\"order:\" + id);\nlock.lock();\ntry { ... } finally { lock.unlock(); }" },
  { term: "分布式事务", category: "分布式", literal: "Distributed Transaction", def: "跨多个服务/数据库的事务，方案：2PC、TCC、消息最终一致性。", code: "// TCC: Try - Confirm - Cancel" },
  { term: "注册中心", category: "分布式", literal: "Registry", def: "服务启动时注册地址，调用方动态发现服务，如 Nacos、Eureka、ZooKeeper。", code: "// 服务发现 + 健康检查" },
  { term: "配置中心", category: "分布式", literal: "Config Center", def: "集中管理各服务配置，支持动态刷新，如 Nacos、Apollo。", code: "// 配置变更无需重启" },
  { term: "API 网关", category: "分布式", literal: "网关 Gateway", def: "统一入口，负责路由、鉴权、限流、日志，如 Spring Cloud Gateway。", code: "spring.cloud.gateway.routes[0].uri=http://user-service" },
  { term: "熔断降级", category: "分布式", literal: "熔断 Circuit Breaker", def: "下游故障时快速失败并返回兜底结果，防止级联雪崩。", code: "@SentinelResource(value = \"get\", fallback = \"fallbackMethod\")" },
  { term: "限流", category: "分布式", literal: "Rate Limiting", def: "控制单位时间请求量，令牌桶/漏桶算法，防止过载。", code: "// QPS 限制，如每秒最多 100 请求" },
  { term: "分布式 ID", category: "分布式", literal: "Distributed ID", def: "多服务生成全局唯一 ID，方案：雪花算法、UUID、号段。", code: "// Snowflake: 时间戳 + 机器ID + 序列号" },
  { term: "ZooKeeper", category: "分布式", literal: "动物园管理员", def: "分布式协调服务，提供一致性、选主、命名服务，基于 ZAB 协议。", code: "// 临时节点 + watch 机制" },

  // ================= 网络与 IO =================
  { term: "HTTP / HTTPS", category: "网络与 IO", literal: "HyperText Transfer Protocol", def: "应用层协议，HTTPS 在 HTTP 上加了 TLS 加密。", code: "GET /index.html HTTP/1.1\nHost: www.example.com" },
  { term: "TCP 三次握手", category: "网络与 IO", literal: "握手 Handshake", def: "建立连接：SYN -> SYN+ACK -> ACK，确认双方收发能力。", code: "客户端 --SYN--> 服务端\n客户端 <-SYN+ACK- 服务端\n客户端 --ACK--> 服务端" },
  { term: "TCP 四次挥手", category: "网络与 IO", literal: "挥手", def: "断开连接：FIN -> ACK -> FIN -> ACK。", code: "客户端 --FIN--> 服务端\n客户端 <-ACK--- 服务端\n客户端 <-FIN--- 服务端\n客户端 --ACK--> 服务端" },
  { term: "BIO / NIO / AIO", category: "网络与 IO", def: "BIO 阻塞同步、NIO 非阻塞多路复用、AIO 异步，NIO 是主流。", code: "// Netty 基于 NIO 实现高性能网络通信" },
  { term: "Netty", category: "网络与 IO", def: "高性能 NIO 网络框架，Dubbo、网关等底层都用它。", code: "new ServerBootstrap().group(boss, worker).channel(NioServerSocketChannel.class);" },
  { term: "WebSocket", category: "网络与 IO", literal: "网络套接字 Socket", def: "全双工长连接协议，服务端可主动推送，用于聊天、实时通知。", code: "// 建立后双向通信，无需轮询" },
  { term: "Cookie / Session", category: "网络与 IO", literal: "会话 Session", phonetic: "/ˈseʃn/", def: "Cookie 存客户端，Session 存服务端，用于识别用户身份。", code: "// 登录后 Session 记录用户，Cookie 存 sessionId" },
  { term: "反向代理", category: "网络与 IO", literal: "Reverse Proxy", phonetic: "/ˈprɒksi/", def: "代理服务器接收请求转发到内部服务，如 Nginx，可负载均衡。", code: "location / { proxy_pass http://backend; }" },

  // ================= 设计模式 =================
  { term: "单例模式", category: "设计模式", literal: "单例 Singleton", phonetic: "/ˈsɪŋɡltən/", def: "一个类只有一个实例，双重校验锁或静态内部类实现。", code: "public class Singleton {\n  private static volatile Singleton s;\n  private Singleton() {}\n  public static Singleton get() { ... }\n}" },
  { term: "工厂模式", category: "设计模式", literal: "工厂 Factory", phonetic: "/ˈfæktri/", def: "通过工厂创建对象，客户端不直接 new，解耦创建逻辑。", code: "BeanFactory  // Spring 中大量使用工厂模式" },
  { term: "代理模式", category: "设计模式", literal: "代理 Proxy", phonetic: "/ˈprɒksi/", def: "为目标对象提供代理，控制访问、增强功能，AOP 就是动态代理。", code: "// JDK 动态代理、CGLIB" },
  { term: "策略模式", category: "设计模式", literal: "策略 Strategy", phonetic: "/ˈstrætədʒi/", def: "定义一组算法，可相互替换，避免大量 if-else。", code: "interface PayStrategy { void pay(); }\nclass AliPay implements PayStrategy { }" },
  { term: "模板方法模式", category: "设计模式", literal: "模板 Template", phonetic: "/ˈtempleɪt/", def: "父类定义算法骨架，子类实现具体步骤。", code: "abstract class Job { void run() { init(); exec(); close(); } }" },
  { term: "观察者模式", category: "设计模式", literal: "观察者 Observer", phonetic: "/əbˈzɜːvə/", def: "对象状态变化时通知所有依赖者，事件监听机制。", code: "// Spring 事件 ApplicationEvent + @EventListener" },
  { term: "装饰器模式", category: "设计模式", literal: "装饰器 Decorator", phonetic: "/ˈdekəreɪtə/", def: "动态给对象添加职责，Java IO 的 BufferedReader 等。", code: "new BufferedReader(new FileReader(f))" },
  { term: "责任链模式", category: "设计模式", literal: "责任链 Chain of Responsibility", def: "请求沿链传递，每个节点决定处理或转发，如拦截器、过滤器。", code: "// FilterChain 逐个处理" },

  // ================= 工程与工具 =================
  { term: "三层架构", category: "工程与工具", def: "Controller 表现层、Service 业务层、Dao 数据层，职责分离。", code: "Controller -> Service -> Dao -> DB" },
  { term: "MVC", category: "工程与工具", literal: "Model-View-Controller", def: "Model 数据、View 视图、Controller 控制器分离的架构模式。", code: "// Spring MVC 的 MVC" },
  { term: "Maven", category: "工程与工具", def: "项目构建和依赖管理工具，用 pom.xml 声明依赖。", code: "mvn clean package" },
  { term: "Git", category: "工程与工具", def: "分布式版本控制，跟踪代码变更、分支协作。", code: "git add . && git commit -m \"msg\" && git push" },
  { term: "单元测试", category: "工程与工具", literal: "Unit Test", def: "对最小单元（方法）的测试，JUnit + Mockito 模拟依赖。", code: "@Test\npublic void testAdd() { assertEquals(2, add(1, 1)); }" },
  { term: "Docker", category: "工程与工具", def: "容器化部署，打包应用及环境，保证环境一致。", code: "docker build -t app .\ndocker run -d app" },
  { term: "微服务", category: "工程与工具", literal: "Microservices", def: "把单体拆成多个独立可部署的小服务，各司其职、独立扩展。", code: "// user-service / order-service / pay-service" }
];
