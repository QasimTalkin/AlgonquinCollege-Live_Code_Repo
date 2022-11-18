<?php 
include './partials/header.php';
?>

<link rel="stylesheet" href="./styles/signUp.css">
<main>
  <form name="signUpForm" class="signupForm">
    <input type="text" name="name" placeholder="Full name...">
    <input type="text" name="email" placeholder="Email...">
    <input type="text" name="uid" placeholder="Username...">
    <input type="password" name="pwd" placeholder="Password...">
    <input type="password" name="pwdrepeat" placeholder="Repeat password...">
    <button type="submit" name="submit">Sign up</button>
  </form>
</main>
<?php
  include './partials/footer.php';
?>
<script src="/script/signup.js"></script>