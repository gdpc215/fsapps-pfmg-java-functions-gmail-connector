package com.fsapps.pfmg.utils.database;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.ForkJoinPool;
import java.util.function.Supplier;

/**
 * Helper class for creating async operations for both repository and service
 * calls.
 * Supports parallel execution with proper error handling and logging.
 * 
 * Patterns:
 * - Repository call: AsyncDBHelper.createAsyncOperation(() ->
 * repository.findAll())
 * - Service call: AsyncDBHelper.createAsyncOperation(() ->
 * someService.selectByBusiness(id))
 * - Void operation (insert/update): AsyncDBHelper.createAsyncVoidOperation(()
 * -> repository.save(entity))
 * - Custom default value: AsyncDBHelper.createAsyncOperation(() ->
 * service.getData(), Collections.emptyList())
 * - Custom executor: AsyncDBHelper.createAsyncOperation(() ->
 * service.getData(), customExecutor)
 */
public class AsyncDBHelper {

  // Use a custom executor or ForkJoin common pool
  private static final Executor DEFAULT_EXECUTOR = ForkJoinPool.commonPool();

  /**
   * Creates a CompletableFuture for a database/service operation.
   * Returns an empty list as default value on error.
   *
   * @param operation The operation to perform (repository or service call).
   * @return A CompletableFuture that wraps the operation.
   */
  @SuppressWarnings("unchecked")
  public static <T extends List<?>> CompletableFuture<T> createAsyncOperation(CheckedSupplier<T> operation) {
    return createAsyncOperation(operation, (T) List.of());
  }

  /**
   * Creates a CompletableFuture for a database/service operation with a custom
   * default value.
   *
   * @param operation    The operation to perform (repository or service call).
   * @param defaultValue The default value to return in case of an error.
   * @return A CompletableFuture that wraps the operation.
   */
  public static <T> CompletableFuture<T> createAsyncOperation(CheckedSupplier<T> operation, T defaultValue) {
    return CompletableFuture.supplyAsync(wrapCheckedException(operation), DEFAULT_EXECUTOR)
        .exceptionally(ex -> {
          System.err.println("Async operation error: " + ex.getMessage());
          return defaultValue;
        });
  }

  /**
   * Creates a CompletableFuture for a database/service operation using a custom
   * executor.
   * Useful for controlling thread pools and concurrency limits.
   *
   * @param operation The operation to perform.
   * @param executor  The executor to use for async execution.
   * @return A CompletableFuture that wraps the operation.
   */
  @SuppressWarnings("unchecked")
  public static <T extends List<?>> CompletableFuture<T> createAsyncOperation(
      CheckedSupplier<T> operation,
      Executor executor) {
    return createAsyncOperation(operation, (T) List.of(), executor);
  }

  /**
   * Creates a CompletableFuture with custom executor and default value.
   *
   * @param operation    The operation to perform.
   * @param defaultValue The default value on error.
   * @param executor     The executor to use.
   * @return A CompletableFuture that wraps the operation.
   */
  public static <T> CompletableFuture<T> createAsyncOperation(
      CheckedSupplier<T> operation,
      T defaultValue,
      Executor executor) {
    return CompletableFuture.supplyAsync(wrapCheckedException(operation), executor)
        .exceptionally(ex -> {
          System.err.println("Async operation error: " + ex.getMessage());
          return defaultValue;
        });
  }

  /**
   * Creates a void async operation (for insert/update/delete).
   * 
   * @param operation The void operation to perform.
   * @return A CompletableFuture<Void>.
   */
  public static CompletableFuture<Void> createAsyncVoidOperation(CheckedRunnable operation) {
    return CompletableFuture.runAsync(wrapCheckedRunnable(operation), DEFAULT_EXECUTOR)
        .exceptionally(ex -> {
          System.err.println("Async operation error: " + ex.getMessage());
          return null;
        });
  }

  /**
   * Creates a void async operation with custom executor.
   * 
   * @param operation The void operation to perform.
   * @param executor  The executor to use.
   * @return A CompletableFuture<Void>.
   */
  public static CompletableFuture<Void> createAsyncVoidOperation(CheckedRunnable operation, Executor executor) {
    return CompletableFuture.runAsync(wrapCheckedRunnable(operation), executor)
        .exceptionally(ex -> {
          System.err.println("Async operation error: " + ex.getMessage());
          return null;
        });
  }

  /**
   * Combines multiple async operations and waits for all to complete.
   * Returns a CompletableFuture that completes when all operations are done.
   *
   * @param futures The futures to combine.
   * @return A CompletableFuture<Void> that completes when all are done.
   */
  public static CompletableFuture<Void> allOf(CompletableFuture<?>... futures) {
    return CompletableFuture.allOf(futures)
        .exceptionally(ex -> {
          System.err.println("Async operation error: " + ex.getMessage());
          return null;
        });
  }

  /**
   * Wraps a checked exception-throwing supplier into a CompletableFuture-friendly
   * supplier.
   * 
   * @param supplier The checked exception-throwing supplier.
   */
  public static <T> Supplier<T> wrapCheckedException(CheckedSupplier<T> supplier) {
    return () -> {
      try {
        return supplier.get();
      } catch (Exception e) {
        throw new RuntimeException("Async operation failed", e);
      }
    };
  }

  /**
   * Wraps a checked exception-throwing runnable into a CompletableFuture-friendly
   * runnable.
   * 
   * @param runnable The checked exception-throwing runnable.
   */
  public static Runnable wrapCheckedRunnable(CheckedRunnable runnable) {
    return () -> {
      try {
        runnable.run();
      } catch (Exception e) {
        throw new RuntimeException("Async operation failed", e);
      }
    };
  }

  @FunctionalInterface
  public interface CheckedSupplier<T> {
    T get();
  }

  @FunctionalInterface
  public interface CheckedRunnable {
    void run();
  }
}