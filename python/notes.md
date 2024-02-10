## Inheritance
- share attributes from generic to more specific
- `issubclass(sub, sup)` returns True if sub is a subclass of sup
- `issubclass(bool, int)` returns True, here if sub is a subclass of sup
- to extend class car from vehicle, `class Car(Vehicle):`
- the constructor `__init__` is not inherited, so we need to call the parent constructor `super().__init__(make, model, year)`

## Key Dunder Methods

- `__init__` : constructor
- `__str__` : string representation of the object
- `__repr__` : representation of the objectm used for debugging

## Run python in interactive mode

- `python3` to run python in interactive mode
- for file cars.py to run in interactive mode `python3 -i cars.py`
-  this will run the file and keep the interpreter open

## Class and Instance Variables

- class variables are shared among all instances of the class
- instance variables are unique to each instance
- `isinatance(obj, class)` returns True if obj is an instance of class
- `hasattr(obj, attr)` returns True if obj has attr

## Exceptions
- `SyntaxError` : when there is a syntax error
- `IndentationError` : when there is an indentation error
- `NameError` : when a variable is not defined
- `TypeError` : when a function is called on a wrong type
- `AttributeError` : when an attribute is not found
- `KeyboardInterrupt` is raised when the user hits the interrupt key (normally Control-C or Delete)
- catching any exception as a base class `except Exception as e:`

## Multiple exceptions catch
- `except (RuntimeError, TypeError, NameError):` here the tuple is used to catch multiple exceptions, the amount of exceptions is not limited
- we can give a name to the exception `except (RuntimeError, TypeError, NameError) as e:`

## exception hiranarchy
- `BaseException` is the base class for all exceptions
- `SystemExit` is raised by the sys.exit() function
- `KeyboardInterrupt` is raised by the user interrupt key
- `Exception` is the base class for all non-exit exceptions

## pass statement
- `pass` is used to do nothing, it is used as a placeholder


## custom exceptions

- all exceptions are classes, so we can create our own exceptions by creating a class that inherits from the `Exception` class
- so we can create a custom exception by creating a class that inherits from the `Exception` class
- `class MyError(Exception):` here we create a custom exception
- `raise MyError("Something went wrong")` here we raise the custom exception


## Raise exceptions

- `raise` is used to raise an exception
- `raise ValueError("Something went wrong")` here we raise a ValueError exception
- `raise` can be used without an exception to re-raise the last exception
