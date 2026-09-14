-- Remove duplicate RolePermission rows, keeping the one with the smallest id
DELETE FROM "RolePermission"
WHERE id NOT IN (
  SELECT MIN(id)
  FROM "RolePermission"
  GROUP BY "roleId", "permissionId"
);

-- Add unique compound constraint
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key"
  ON "RolePermission"("roleId", "permissionId");
