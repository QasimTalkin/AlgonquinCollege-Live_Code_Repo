# Algonquin College
## School of Advanced Technology
### Course: CST8238 – Web Programming II
### Midterm Examination

**Date:** October 24th  
**Total Questions:** 45 Multiple Choice Questions  
**Time Allowed:** 90 Minutes  
**Instructor:** Prof. Abul Qasim / Prof. Hala Owen  

---

## Instructions
1. Answer all 45 questions.
2. Select the **one** best answer for each question (A, B, C, or D).
3. Record your answers on the provided scantron or answer sheet.
4. This exam covers HTML5 Semantics, CSS3 Styling, Layout Systems (Flexbox/Grid), Bootstrap Framework, and Basic JavaScript Logic.
5. Calculators and external devices are not permitted.

---

## Part 1: HTML5 Structure & Semantics

### Question 1
Which declaration must appear at the very beginning of an HTML document to define it as HTML5?
- [ ] A. `<html version="5">`
- [ ] B. `<!DOCTYPE html>`
- [ ] C. `<head type="html5">`
- [ ] D. `<?xml version="1.0">`
<!-- Answer: B -->

### Question 2
Which element serves as the root container that wraps all visible and metadata content on a webpage?
- [ ] A. `<body>`
- [ ] B. `<head>`
- [ ] C. `<html>`
- [ ] D. `<root>`
<!-- Answer: C -->

### Question 3
Where should metadata, such as the character set and page title, be placed within an HTML document?
- [ ] A. Inside the `<body>` tag
- [ ] B. Inside the `<footer>` tag
- [ ] C. Inside the `<head>` tag
- [ ] D. Inside the `<nav>` tag
<!-- Answer: C -->

### Question 4
Which semantic element is best suited for defining the introductory content of a page, typically containing the main heading and logo?
- [ ] A. `<section>`
- [ ] B. `<header>`
- [ ] C. `<article>`
- [ ] D. `<aside>`
<!-- Answer: B -->

### Question 5
To create a navigation menu, which semantic tag should wrap the list of links?
- [ ] A. `<menu>`
- [ ] B. `<navigation>`
- [ ] C. `<nav>`
- [ ] D. `<dir>`
<!-- Answer: C -->

### Question 6
Which attribute is used within an anchor `<a>` tag to create a link to a specific section on the same page?
- [ ] A. `src="#section-id"`
- [ ] B. `link="#section-id"`
- [ ] C. `href="#section-id"`
- [ ] D. `ref="#section-id"`
<!-- Answer: C -->

### Question 7
Which semantic element represents a self-contained composition, such as a blog post or news article, that could be distributed independently?
- [ ] A. `<section>`
- [ ] B. `<div>`
- [ ] C. `<article>`
- [ ] D. `<span>`
<!-- Answer: C -->

### Question 8
If you need to display content that is tangentially related to the main content, such as a sidebar or call-out box, which tag should be used?
- [ ] A. `<sidebar>`
- [ ] B. `<aside>`
- [ ] C. `<section>`
- [ ] D. `<meta>`
<!-- Answer: B -->

### Question 9
Which tag is used to define important text that should typically be rendered in bold?
- [ ] A. `<b>`
- [ ] B. `<bold>`
- [ ] C. `<strong>`
- [ ] D. `<em>`
<!-- Answer: C -->

### Question 10
Which element is used to define abbreviations or acronyms, allowing for a tooltip explanation?
- [ ] A. `<acronym>`
- [ ] B. `<abbr>`
- [ ] C. `<short>`
- [ ] D. `<define>`
<!-- Answer: B -->

### Question 11
In an HTML table, which tag defines a header cell that is typically bold and centered?
- [ ] A. `<td>`
- [ ] B. `<tr>`
- [ ] C. `<th>`
- [ ] D. `<head>`
<!-- Answer: C -->

### Question 12
Which list type is most appropriate for displaying a chronological work history?
- [ ] A. Unordered List (`<ul>`)
- [ ] B. Definition List (`<dl>`)
- [ ] C. Ordered List (`<ol>`)
- [ ] D. Navigation List (`<nav>`)
<!-- Answer: C -->

### Question 13
Which attribute is mandatory for the `<img>` tag to ensure accessibility for screen readers?
- [ ] A. `title`
- [ ] B. `src`
- [ ] C. `alt`
- [ ] D. `description`
<!-- Answer: C -->

### Question 14
To embed a video file with play and pause controls visible to the user, which attribute must be added to the `<video>` tag?
- [ ] A. `play`
- [ ] B. `controls`
- [ ] C. `manage`
- [ ] D. `interface`
<!-- Answer: B -->

### Question 15
Which form element is used to create a multi-line text input field?
- [ ] A. `<input type="text">`
- [ ] B. `<textbox>`
- [ ] C. `<textarea>`
- [ ] D. `<input type="multiline">`
<!-- Answer: C -->

---

## Part 2: CSS Fundamentals & Styling

### Question 16
How do you correctly link an external CSS file named `styles.css` to an HTML document?
- [ ] A. `<style src="styles.css">`
- [ ] B. `<link rel="stylesheet" href="styles.css">`
- [ ] C. `<css link="styles.css">`
- [ ] D. `<script href="styles.css">`
<!-- Answer: B -->

### Question 17
Which CSS selector is known as the "universal selector" and selects all elements on the page?
- [ ] A. `#all`
- [ ] B. `.reset`
- [ ] C. `*`
- [ ] D. `body`
<!-- Answer: C -->

### Question 18
What is the correct syntax for selecting an element with the class name `container`?
- [ ] A. `#container`
- [ ] B. `container`
- [ ] C. `.container`
- [ ] D. `*container`
<!-- Answer: C -->

### Question 19
Which CSS property is used to set the size of the text?
- [ ] A. `text-size`
- [ ] B. `font-size`
- [ ] C. `size`
- [ ] D. `font-weight`
<!-- Answer: B -->

### Question 20
To improve the readability of paragraph text, which property controls the vertical space between lines?
- [ ] A. `letter-spacing`
- [ ] B. `word-spacing`
- [ ] C. `line-height`
- [ ] D. `vertical-align`
<!-- Answer: C -->

### Question 21
Which box model property creates space *inside* an element's border?
- [ ] A. `margin`
- [ ] B. `border`
- [ ] C. `padding`
- [ ] D. `spacing`
<!-- Answer: C -->

### Question 22
Which box model property creates space *outside* an element's border?
- [ ] A. `margin`
- [ ] B. `border`
- [ ] C. `padding`
- [ ] D. `outline`
<!-- Answer: A -->

### Question 23
How do you horizontally center a block-level element with a fixed width?
- [ ] A. `margin: center;`
- [ ] B. `text-align: center;`
- [ ] C. `margin: 0 auto;`
- [ ] D. `padding: 0 auto;`
<!-- Answer: C -->

### Question 24
Which pseudo-class selector is used to define styles when a user hovers their mouse over an element?
- [ ] A. `:active`
- [ ] B. `:focus`
- [ ] C. `:hover`
- [ ] D. `:mouse`
<!-- Answer: C -->

### Question 25
Which property is used to remove bullet points from an unordered list?
- [ ] A. `list-style-type: none;`
- [ ] B. `bullet-style: none;`
- [ ] C. `list-type: empty;`
- [ ] D. `decoration: none;`
<!-- Answer: A -->

### Question 26
Which CSS property adds rounded corners to an element?
- [ ] A. `border-circle`
- [ ] B. `border-radius`
- [ ] C. `corner-round`
- [ ] D. `image-shape`
<!-- Answer: B -->

### Question 27
In table styling, which property removes the default space between adjacent cell borders?
- [ ] A. `border-spacing: 0;`
- [ ] B. `border-collapse: collapse;`
- [ ] C. `border-style: none;`
- [ ] D. `table-layout: fixed;`
<!-- Answer: B -->

---

## Part 3: Layout Systems (Flexbox & Grid)

### Question 28
Which CSS property value turns a container into a Flexbox container?
- [ ] A. `display: block;`
- [ ] B. `display: flex;`
- [ ] C. `layout: flex;`
- [ ] D. `position: flex;`
<!-- Answer: B -->

### Question 29
In a Flexbox container, which property aligns items along the main axis (e.g., horizontally in a row)?
- [ ] A. `align-items`
- [ ] B. `justify-content`
- [ ] C. `flex-direction`
- [ ] D. `flex-wrap`
<!-- Answer: B -->

### Question 30
Which Flexbox property allows items to wrap onto multiple lines if there isn't enough space?
- [ ] A. `flex-wrap: wrap;`
- [ ] B. `flex-flow: row;`
- [ ] C. `overflow: auto;`
- [ ] D. `white-space: normal;`
<!-- Answer: A -->

### Question 31
Which CSS property value turns a container into a Grid container?
- [ ] A. `display: grid;`
- [ ] B. `display: table;`
- [ ] C. `layout: grid;`
- [ ] D. `position: grid;`
<!-- Answer: A -->

### Question 32
Which CSS Grid property defines the number and size of columns in a grid?
- [ ] A. `grid-columns`
- [ ] B. `grid-template-columns`
- [ ] C. `grid-layout-columns`
- [ ] D. `column-count`
<!-- Answer: B -->

### Question 33
How do you make a grid item span across two columns?
- [ ] A. `grid-column: 2;`
- [ ] B. `grid-span: 2;`
- [ ] C. `grid-column: span 2;`
- [ ] D. `col-span: 2;`
<!-- Answer: C -->

### Question 34
Flexbox is generally best suited for which type of layout?
- [ ] A. Two-dimensional layouts (rows and columns simultaneously)
- [ ] B. One-dimensional layouts (either a row or a column)
- [ ] C. Complex magazine-style layouts
- [ ] D. Database structure visualization
<!-- Answer: B -->

### Question 35
CSS Grid is generally best suited for which type of layout?
- [ ] A. Simple navigation bars
- [ ] B. One-dimensional lists
- [ ] C. Two-dimensional layouts (rows and columns simultaneously)
- [ ] D. Text typography only
<!-- Answer: C -->

### Question 36
Which property adds consistent spacing between grid or flex items?
- [ ] A. `spacing`
- [ ] B. `gap`
- [ ] C. `margin-between`
- [ ] D. `padding-between`
<!-- Answer: B -->

---

## Part 4: Bootstrap & Responsive Design

### Question 37
Which meta tag is required in the `<head>` section to ensure proper rendering on mobile devices?
- [ ] A. `<meta name="description">`
- [ ] B. `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- [ ] C. `<link rel="mobile" href="responsive">`
- [ ] D. `<script src="responsive.js">`
<!-- Answer: B -->

### Question 38
How is the Bootstrap framework typically included in a project via CDN?
- [ ] A. `<script src="bootstrap.js">`
- [ ] B. `<link href="bootstrap.css" rel="stylesheet">`
- [ ] C. `<import bootstrap>`
- [ ] D. `<style src="bootstrap">`
<!-- Answer: B -->

### Question 39
Which Bootstrap class creates a fixed-width responsive container?
- [ ] A. `.container-fluid`
- [ ] B. `.wrap`
- [ ] C. `.container`
- [ ] D. `.box`
<!-- Answer: C -->

### Question 40
In the Bootstrap grid system, which class is used to create a horizontal group of columns?
- [ ] A. `.grid`
- [ ] B. `.row`
- [ ] C. `.line`
- [ ] D. `.section`
<!-- Answer: B -->

### Question 41
Which Bootstrap component is commonly used to create contained content boxes with headers and footers?
- [ ] A. `.box`
- [ ] B. `.panel`
- [ ] C. `.card`
- [ ] D. `.frame`
<!-- Answer: C -->

### Question 42
What is the standard conventional filename for the homepage of a website?
- [ ] A. `home.html`
- [ ] B. `main.html`
- [ ] C. `index.html`
- [ ] D. `default.html`
<!-- Answer: C -->

---

## Part 5: JavaScript Fundamentals

### Question 43
What will be the output of the following JavaScript code snippet?
```javascript
let a = 5;
let b = "5";
console.log(a + b);
```
- [ ] A. `10`
- [ ] B. `"55"`
- [ ] C. `55`
- [ ] D. `Error`
<!-- Answer: B -->

### Question 44
What is the primary difference between the `==` and `===` operators in JavaScript?
- [ ] A. `==` compares only values (with type coercion), while `===` compares both value and type (strict equality).
- [ ] B. `==` is used for comparing strings, while `===` is used for comparing numbers.
- [ ] C. `==` is an assignment operator, while `===` is a comparison operator.
- [ ] D. There is no functional difference between the two operators.
<!-- Answer: A -->

### Question 45
Which keyword is used to define a function in JavaScript?
- [ ] A. `def`
- [ ] B. `function`
- [ ] C. `func`
- [ ] D. `void`
<!-- Answer: B -->

---

<!--
### Answer Key

| Q# | Answer | Q# | Answer | Q# | Answer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | B | **16** | B | **31** | A |
| **2** | C | **17** | C | **32** | B |
| **3** | C | **18** | C | **33** | C |
| **4** | B | **19** | B | **34** | B |
| **5** | C | **20** | C | **35** | C |
| **6** | C | **21** | C | **36** | B |
| **7** | C | **22** | A | **37** | B |
| **8** | B | **23** | C | **38** | B |
| **9** | C | **24** | C | **39** | C |
| **10** | B | **25** | A | **40** | B |
| **11** | C | **26** | B | **41** | C |
| **12** | C | **27** | B | **42** | C |
| **13** | C | **28** | B | **43** | B |
| **14** | B | **29** | B | **44** | A |
| **15** | C | **30** | A | **45** | B |
-->

---
*End of Examination*