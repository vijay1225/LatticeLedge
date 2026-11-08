package com.latticeledger.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.provider.Settings;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;

@CapacitorPlugin(name = "NativeVaultPicker")
public class NativeVaultPickerPlugin extends Plugin {

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION |
            Intent.FLAG_GRANT_WRITE_URI_PERMISSION |
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION |
            Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
        );
        startActivityForResult(call, intent, "pickFolderResult");
    }

    @ActivityCallback
    private void pickFolderResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("Folder selection cancelled");
            return;
        }

        Uri treeUri = result.getData().getData();
        try {
            final int takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
            getContext().getContentResolver().takePersistableUriPermission(treeUri, takeFlags);
        } catch (Exception e) {
            // Some document providers do not support persistable permissions; continue anyway
        }

        String docId = null;
        try {
            docId = DocumentsContract.getTreeDocumentId(treeUri);
        } catch (Exception e) {
            docId = treeUri.getLastPathSegment();
        }

        String relativePath = "";
        String fullPath = "";
        String displayName = "";

        if (docId != null && docId.startsWith("primary:")) {
            relativePath = docId.substring("primary:".length()).replaceAll("^/+", "");
            fullPath = Environment.getExternalStorageDirectory().getAbsolutePath() + (relativePath.isEmpty() ? "" : "/" + relativePath);
            displayName = relativePath.isEmpty() ? "Internal Storage" : relativePath;
        } else if (docId != null && docId.contains(":")) {
            String[] parts = docId.split(":", 2);
            relativePath = parts.length > 1 ? parts[1].replaceAll("^/+", "") : "";
            File sdCard = new File("/storage/" + parts[0] + (relativePath.isEmpty() ? "" : "/" + relativePath));
            if (sdCard.exists()) {
                fullPath = sdCard.getAbsolutePath();
            } else {
                fullPath = Environment.getExternalStorageDirectory().getAbsolutePath() + "/" + relativePath;
            }
            displayName = parts[0] + (relativePath.isEmpty() ? "" : "/" + relativePath);
        } else {
            fullPath = treeUri.getPath() != null ? treeUri.getPath() : treeUri.toString();
            displayName = treeUri.getLastPathSegment();
        }

        JSObject ret = new JSObject();
        ret.put("path", fullPath);
        ret.put("displayName", displayName);
        ret.put("treeUri", treeUri.toString());
        call.resolve(ret);
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            ret.put("granted", Environment.isExternalStorageManager());
        } else {
            ret.put("granted", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (Environment.isExternalStorageManager()) {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                call.resolve(ret);
                return;
            }
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                intent.setData(Uri.parse("package:" + getActivity().getPackageName()));
                startActivityForResult(call, intent, "permissionResult");
            } catch (Exception e) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                    startActivityForResult(call, intent, "permissionResult");
                } catch (Exception e2) {
                    call.reject("Could not open All Files Access settings: " + e2.getMessage());
                }
            }
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @ActivityCallback
    private void permissionResult(PluginCall call, ActivityResult result) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            ret.put("granted", Environment.isExternalStorageManager());
        } else {
            ret.put("granted", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void checkVaultFile(PluginCall call) {
        String folderPath = call.getString("folderPath");
        String fileName = call.getString("fileName", "lattice_vault.db");
        if (folderPath == null) {
            call.reject("folderPath is required");
            return;
        }

        File file = new File(folderPath, fileName);
        JSObject ret = new JSObject();
        ret.put("exists", file.exists() && file.isFile());
        ret.put("mtime", file.lastModified());
        ret.put("size", file.length());
        call.resolve(ret);
    }

    @PluginMethod
    public void readVaultFile(PluginCall call) {
        String folderPath = call.getString("folderPath");
        String fileName = call.getString("fileName", "lattice_vault.db");
        if (folderPath == null) {
            call.reject("folderPath is required");
            return;
        }

        File file = new File(folderPath, fileName);
        if (!file.exists() || !file.isFile()) {
            JSObject ret = new JSObject();
            ret.put("data", null);
            call.resolve(ret);
            return;
        }

        try (FileInputStream fis = new FileInputStream(file)) {
            byte[] buffer = new byte[(int) file.length()];
            int read = 0;
            int offset = 0;
            while (offset < buffer.length && (read = fis.read(buffer, offset, buffer.length - offset)) >= 0) {
                offset += read;
            }
            String base64 = Base64.encodeToString(buffer, Base64.NO_WRAP);
            JSObject ret = new JSObject();
            ret.put("data", base64);
            ret.put("mtime", file.lastModified());
            ret.put("size", file.length());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read file: " + e.getMessage());
        }
    }

    @PluginMethod
    public void writeVaultFile(PluginCall call) {
        String folderPath = call.getString("folderPath");
        String fileName = call.getString("fileName", "lattice_vault.db");
        String base64Data = call.getString("data");
        if (folderPath == null || base64Data == null) {
            call.reject("folderPath and data are required");
            return;
        }

        try {
            File dir = new File(folderPath);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            File file = new File(dir, fileName);
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);

            File tmpFile = new File(dir, fileName + ".tmp");
            try (FileOutputStream fos = new FileOutputStream(tmpFile)) {
                fos.write(bytes);
                fos.flush();
            }

            if (file.exists()) {
                file.delete();
            }
            tmpFile.renameTo(file);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("mtime", file.lastModified());
            ret.put("size", file.length());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to write file: " + e.getMessage());
        }
    }

    @PluginMethod
    public void ensureAssetsDir(PluginCall call) {
        String folderPath = call.getString("folderPath");
        if (folderPath == null) {
            call.reject("folderPath is required");
            return;
        }
        File assetsDir = new File(folderPath, "assets");
        boolean created = assetsDir.exists() || assetsDir.mkdirs();
        JSObject ret = new JSObject();
        ret.put("success", created);
        call.resolve(ret);
    }

    @PluginMethod
    public void writeAssetFile(PluginCall call) {
        String folderPath = call.getString("folderPath");
        String assetPath = call.getString("assetPath");
        String base64Data = call.getString("data");
        if (folderPath == null || assetPath == null || base64Data == null) {
            call.reject("folderPath, assetPath and data are required");
            return;
        }
        try {
            File file = new File(folderPath, assetPath);
            File parent = file.getParentFile();
            if (parent != null && !parent.exists()) {
                parent.mkdirs();
            }
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(bytes);
                fos.flush();
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to write asset: " + e.getMessage());
        }
    }

    @PluginMethod
    public void readAssetFile(PluginCall call) {
        String folderPath = call.getString("folderPath");
        String assetPath = call.getString("assetPath");
        if (folderPath == null || assetPath == null) {
            call.reject("folderPath and assetPath are required");
            return;
        }
        File file = new File(folderPath, assetPath);
        if (!file.exists() || !file.isFile()) {
            JSObject ret = new JSObject();
            ret.put("data", null);
            call.resolve(ret);
            return;
        }
        try (FileInputStream fis = new FileInputStream(file)) {
            byte[] buffer = new byte[(int) file.length()];
            int read = 0;
            int offset = 0;
            while (offset < buffer.length && (read = fis.read(buffer, offset, buffer.length - offset)) >= 0) {
                offset += read;
            }
            String base64 = Base64.encodeToString(buffer, Base64.NO_WRAP);
            JSObject ret = new JSObject();
            ret.put("data", base64);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read asset: " + e.getMessage());
        }
    }
}
