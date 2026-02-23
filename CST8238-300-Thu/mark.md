| PDO Statement        | What it Does      | What User Gets |
| -------------------- | ----------------- | -------------- |
| `new PDO()`          | Connect           | PDO object     |
| `prepare()`          | Prepares query    | PDOStatement   |
| `bindParam()`        | Bind variables    | Secure input   |
| `execute()`          | Run query         | true/false     |
| `fetch()`            | Get 1 row         | Array / false  |
| `fetchAll()`         | Get all rows      | Array[]        |
| `fetchColumn()`      | Get one value     | string/int     |
| `lastInsertId()`     | Last inserted ID  | int            |
| `rowCount()`         | Affected rows     | int            |
| `beginTransaction()` | Start transaction | —              |
| `commit()`           | Save              | —              |
| `rollBack()`         | Undo              | —              |


---

# ✅ **PHP + PDO CRUD Example (Full Working Sample)**

## **📌 1. Database Setup (MySQL)**

Create a table:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# ✅ **📌 2. db.php — PDO Connection File**

```php
<?php
$host = "localhost";
$db = "test_db";
$user = "root";
$pass = "";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
?>
```

---

# ✅ **📌 3. CREATE — Add User**

```php
<?php
require "db.php";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $stmt = $pdo->prepare("INSERT INTO users (name, email) VALUES (:name, :email)");
    $stmt->execute([
        ":name" => $_POST["name"],
        ":email" => $_POST["email"]
    ]);

    echo "User added! ID: " . $pdo->lastInsertId();
}
?>

<form method="POST">
    <input name="name" placeholder="Name">
    <input name="email" placeholder="Email">
    <button type="submit">Add User</button>
</form>
```

---

# ✅ **📌 4. READ — List All Users**

```php
<?php
require "db.php";

$stmt = $pdo->query("SELECT * FROM users");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<h2>User List</h2>
<ul>
<?php foreach ($users as $user): ?>
    <li>
        <?= $user["id"] ?> - <?= $user["name"] ?> (<?= $user["email"] ?>)
        <a href="update.php?id=<?= $user['id'] ?>">Edit</a>
        <a href="delete.php?id=<?= $user['id'] ?>">Delete</a>
    </li>
<?php endforeach; ?>
</ul>
```

---

# ✅ **📌 5. UPDATE — Edit a User**

**update.php**

```php
<?php
require "db.php";

$id = $_GET["id"];

$stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
$stmt->execute([":id" => $id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $stmt = $pdo->prepare("UPDATE users SET name = :name, email = :email WHERE id = :id");
    $stmt->execute([
        ":name" => $_POST["name"],
        ":email" => $_POST["email"],
        ":id" => $id
    ]);

    echo "Updated!";
}
?>

<form method="POST">
    <input name="name" value="<?= $user['name'] ?>">
    <input name="email" value="<?= $user['email'] ?>">
    <button type="submit">Save</button>
</form>
```

---

# ✅ **📌 6. DELETE — Remove a User**

**delete.php**

```php
<?php
require "db.php";

$id = $_GET["id"];

$stmt = $pdo->prepare("DELETE FROM users WHERE id = :id");
$stmt->execute([":id" => $id]);

echo "User deleted!";
?>
```

---
