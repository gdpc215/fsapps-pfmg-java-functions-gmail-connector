package com.fsapps.pfmg.handler;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fsapps.pfmg.features.salutation.UserSalutationLogic;
import com.fsapps.pfmg.features.salutation.user.UserEntity;
import com.microsoft.azure.functions.ExecutionContext;
import com.microsoft.azure.functions.HttpMethod;
import com.microsoft.azure.functions.HttpRequestMessage;
import com.microsoft.azure.functions.HttpResponseMessage;
import com.microsoft.azure.functions.HttpStatus;
import com.microsoft.azure.functions.annotation.AuthorizationLevel;
import com.microsoft.azure.functions.annotation.FunctionName;
import com.microsoft.azure.functions.annotation.HttpTrigger;

/**
 * Azure Functions handler for Spring Cloud Functions.
 * This delegates to Spring Cloud Function framework.
 */
@Component
public class AzureFunctionHandler {

  @Autowired
  private UserSalutationLogic userSalutation;

  @FunctionName("userSalutation")
  public HttpResponseMessage userSalutation(
      @HttpTrigger(name = "req", methods = { HttpMethod.GET,
          HttpMethod.POST }, authLevel = AuthorizationLevel.ANONYMOUS, route = "user/salutation") HttpRequestMessage<Optional<UserEntity>> request,
      ExecutionContext context) {

    UserEntity user = request.getBody()
        .filter(u -> u.id != null)
        .orElseGet(() -> new UserEntity(null, request.getQueryParameters().getOrDefault("name", "world"), null));

    context.getLogger().info("Greeting user name: " + user.strName + ", user ID: " + user.id + ", email: " + user.strEmail);

    String greeting = userSalutation.apply(user);

    return request
        .createResponseBuilder(HttpStatus.OK)
        .body(greeting)
        .header("Content-Type", "application/json")
        .build();
  }
}
