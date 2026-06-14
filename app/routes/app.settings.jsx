import { useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const settings = await db.settings.findUnique({ where: { shop: session.shop } });
  return {
    settings: settings || {
      reminderDays: 7,
      reminderEnabled: true,
      senderName: "",
      emailSubject: "You left something behind ♥",
      replyTo: "",
    },
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  const data = {
    reminderEnabled: form.get("reminderEnabled") === "true",
    reminderDays: Math.max(1, parseInt(form.get("reminderDays") || "7", 10)),
    senderName: String(form.get("senderName") || "").slice(0, 100),
    emailSubject: String(form.get("emailSubject") || "You left something behind ♥").slice(0, 150),
    replyTo: String(form.get("replyTo") || "").slice(0, 200),
  };

  await db.settings.upsert({
    where: { shop: session.shop },
    update: data,
    create: { shop: session.shop, ...data },
  });

  return { saved: true };
};

export default function SettingsPage() {
  const { settings } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const isSaving = ["loading", "submitting"].includes(fetcher.state);

  useEffect(() => {
    if (fetcher.data?.saved) {
      shopify.toast.show("Settings saved");
    }
  }, [fetcher.data?.saved, shopify]);

  return (
    <s-page heading="Wishlist Settings">
      <fetcher.Form method="POST">
        <s-layout>

        {/* Email Reminders */}
        <s-section heading="Email Reminders">
          <s-paragraph>
            Automatically remind customers about the products they saved before leaving your store. A reminder email is sent after the number of days you choose below.
          </s-paragraph>

          <s-stack direction="block" gap="base">
            <s-select
              name="reminderEnabled"
              label="Reminder emails"
              value={settings.reminderEnabled ? "true" : "false"}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </s-select>

            <s-text-field
              name="reminderDays"
              label="Send reminder after (days)"
              type="number"
              min="1"
              max="90"
              defaultValue={String(settings.reminderDays)}
              help-text="How many days after a customer saves their wishlist to send the reminder."
            />
          </s-stack>
        </s-section>

        {/* Email Branding */}
        <s-section heading="Email Branding">
          <s-stack direction="block" gap="base">
            <s-text-field
              name="senderName"
              label="Sender name"
              defaultValue={settings.senderName}
              placeholder="Your Store"
              help-text="Shown as the 'From' name in the email. Defaults to your store name."
            />

            <s-text-field
              name="emailSubject"
              label="Email subject line"
              defaultValue={settings.emailSubject}
              help-text="The subject customers see in their inbox."
            />

            <s-text-field
              name="replyTo"
              label="Reply-to email (optional)"
              type="email"
              defaultValue={settings.replyTo}
              placeholder="support@yourdomain.com"
              help-text="Where replies go. Leave blank to use your Resend sending address."
            />
          </s-stack>
        </s-section>

        <s-section slot="aside" heading="How it works">
          <s-unordered-list>
            <s-list-item>Customer saves products to their wishlist</s-list-item>
            <s-list-item>They enter their email on the wishlist page</s-list-item>
            <s-list-item>We send an instant confirmation with their saved items</s-list-item>
            <s-list-item>A follow-up reminder is sent after the delay you set</s-list-item>
            <s-list-item>Each email shows product images, prices, and a direct link back to buy</s-list-item>
          </s-unordered-list>
        </s-section>

        <s-section>
          <s-button
            variant="primary"
            type="submit"
            {...(isSaving ? { loading: true } : {})}
          >
            Save Settings
          </s-button>
        </s-section>

        </s-layout>
      </fetcher.Form>
    </s-page>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
