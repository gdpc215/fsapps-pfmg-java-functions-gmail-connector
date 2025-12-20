DROP TABLE IF EXISTS M_USER 
GO
CREATE TABLE M_USER (
  id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
  strName VARCHAR(200) NULL,
  strEmail VARCHAR(320) NULL,
  dateCreation DATETIME NULL DEFAULT [dbo].[fn_getcurrentdate](),
  dateModification DATETIME NULL DEFAULT [dbo].[fn_getcurrentdate]()
)
GO

DROP PROCEDURE IF EXISTS spUser_Get
GO
CREATE PROCEDURE spUser_Get
  @userId UNIQUEIDENTIFIER = NULL,
  @strEmail VARCHAR(320) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  SELECT *
  FROM M_USER U
  WHERE U.id = @userId;
END
GO

-- Creates a new user with all the information
DROP PROCEDURE IF EXISTS spUser_Create_ReturnId
GO
CREATE PROCEDURE spUser_Create_ReturnId
  @strName VARCHAR(200),
  @strEmail VARCHAR(320),
  @insertedId UNIQUEIDENTIFIER OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  
  DECLARE @tableInsertedId TABLE (id UNIQUEIDENTIFIER);

  INSERT INTO M_USER (
      strName, strEmail
  )
  OUTPUT INSERTED.id INTO @tableInsertedId
  VALUES (
      @strName, @strEmail
  );

  SET @insertedId = (SELECT id FROM @tableInsertedId);
END
GO

DROP PROCEDURE IF EXISTS spUser_Update
GO
CREATE PROCEDURE spUser_Update
  @userId UNIQUEIDENTIFIER,
  @strName VARCHAR(200) = NULL,
  @strEmail VARCHAR(320) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE M_USER SET
    strName = ISNULL(@strName, strName),
    strEmail = ISNULL(@strEmail, strEmail),
    dateModification = [dbo].[fn_getcurrentdate]()
  WHERE id = @userId;
END
GO