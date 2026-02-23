ry {
$pdo = new PDO("mysql:host=localhost;dbname=store", "user", "pass");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
echo "Connected!";
} catch (PDOException $e) {
echo "Connection failed: " . $e->getMessage();
}


$sql = "SELECT * FROM Users WHERE email = '$email'";