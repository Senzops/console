import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind";

Config.overrideWebpackConfig((currentConfiguration) => {
  const withTailwind = enableTailwind(currentConfiguration);

  return {
    ...withTailwind,
    module: {
      ...withTailwind.module,
      rules: [
        ...(withTailwind.module?.rules ?? []),
        {
          test: /\.(mp3|wav|ogg|aac)$/i,
          type: "asset/resource" as const,
        },
      ],
    },
  };
});
